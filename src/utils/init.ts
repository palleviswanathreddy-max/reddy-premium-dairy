import { logger } from '@/utils/logger';
import { cache } from '@/utils/cache';
import { getDb } from '@/db/db';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function seedPostgresFromLocalJSON() {
  try {
    const localDb = getDb();

    // Idempotency check: compare file hashes
    const hashFilePath = path.join(process.cwd(), 'src/db/localdb_hash.txt');
    const localDbPath = path.join(process.cwd(), 'src/db/localdb.json');
    let currentHash = '';
    try {
      if (fs.existsSync(localDbPath)) {
        const fileContent = fs.readFileSync(localDbPath, 'utf8');
        currentHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      }
    } catch (hashErr) {
      logger.error('Failed to compute localdb.json hash', hashErr as Error);
    }

    const productCount = await prisma.product.count();
    if (productCount > 0 && currentHash) {
      try {
        if (fs.existsSync(hashFilePath)) {
          const storedHash = fs.readFileSync(hashFilePath, 'utf8').trim();
          if (storedHash === currentHash) {
            logger.info('⚡ Database initialization matches checksum. Skipping seeding.');
            return;
          }
        }
      } catch (readErr) {
        logger.error('Failed to read stored localdb hash', readErr as Error);
      }
    }

    // Ensure clean removal of user-guest from DB if it previously existed
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: 'user-guest' },
          { email: 'guest@reddypremiumdairy.com' }
        ]
      }
    });

    // 1. Categories & Products
    if (localDb.products && localDb.products.length > 0) {
      logger.info('🌱 Seeding/Syncing Categories and Products in PostgreSQL...');
      
      // Get unique categories
      const categories = Array.from(new Set(localDb.products.map((p: any) => p.category)));
      
      // Seed Categories
      await Promise.all(categories.map(async (catName) => {
        await prisma.category.upsert({
          where: { name: catName },
          update: {},
          create: {
            name: catName,
            slug: (catName as string).toLowerCase().replace(/\s+/g, '-'),
          },
        });
      }));

      const dbCategories = await prisma.category.findMany();
      const catMap: Record<string, string> = {};
      dbCategories.forEach(c => {
        catMap[c.name] = c.id;
      });

      // Seed/Sync Products in batches of 10 to avoid connection overload
      const products = localDb.products;
      const batchSize = 10;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        await Promise.all(batch.map(async (p: any) => {
          const catId = catMap[p.category];
          if (!catId) return;
          
          const productData = {
            sku: p.sku,
            name: p.name,
            categoryId: catId,
            brand: p.brand,
            description: p.description,
            ingredients: p.ingredients,
            storage: p.storage,
            nutrition: p.nutrition as any,
            weight: p.weight,
            volume: p.volume,
            mrp: p.mrp,
            price: p.price,
            discount: p.discount,
            gst: p.gst,
            stock: p.stock,
            status: p.status,
            expiryDays: p.expiryDays,
            deliveryTime: p.deliveryTime,
            rating: p.rating,
            images: p.images,
            tags: p.tags,
            frequentlyBoughtTogether: p.frequentlyBoughtTogether,
            relatedProducts: p.relatedProducts,
            variants: p.variants as any || [],
            faq: p.faq as any || [],
          };

          await prisma.product.upsert({
            where: { id: p.id },
            update: productData,
            create: {
              id: p.id,
              ...productData
            }
          });
        }));
      }
    }

    // 2. Coupons
    if (localDb.coupons && localDb.coupons.length > 0) {
      logger.info('🌱 Seeding/Syncing Coupons in PostgreSQL...');
      await Promise.all(localDb.coupons.map(async (cp: any) => {
        await prisma.coupon.upsert({
          where: { code: cp.code },
          update: {
            description: cp.description,
            type: cp.type || 'flat',
            value: cp.value,
            minPurchase: cp.minPurchase,
            maxDiscount: cp.maxDiscount ?? null,
            expiryDate: cp.expiryDate ? new Date(cp.expiryDate) : null,
            isActive: cp.isActive !== false,
          },
          create: {
            code: cp.code,
            description: cp.description,
            type: cp.type || 'flat',
            value: cp.value,
            minPurchase: cp.minPurchase,
            maxDiscount: cp.maxDiscount ?? null,
            expiryDate: cp.expiryDate ? new Date(cp.expiryDate) : null,
            isActive: cp.isActive !== false,
          },
        });
      }));
    }

    // 3. Delivery Partners
    const dpCount = await prisma.deliveryPartner.count();
    if (dpCount === 0 && localDb.deliveryPartners && localDb.deliveryPartners.length > 0) {
      logger.info('🌱 Seeding Delivery Partners in PostgreSQL...');
      await Promise.all(localDb.deliveryPartners.map(async (dp: any) => {
        await prisma.deliveryPartner.create({
          data: {
            id: dp.id,
            name: dp.name,
            phone: dp.phone,
            email: dp.email || null,
            vehicle: dp.vehicle,
            vehicleNumber: dp.vehicleNumber || null,
            isActive: dp.isActive !== false,
            currentOrderId: dp.currentOrderId || null,
            completedDeliveries: dp.completedDeliveries || 0,
            rating: dp.rating || 5.0,
          },
        });
      }));
    }

    // 4. Users (Admin and standard users)
    const userCount = await prisma.user.count();
    if (userCount === 0 && localDb.users && localDb.users.length > 0) {
      logger.info('🌱 Seeding Users in PostgreSQL...');
      await Promise.all(localDb.users.map(async (u: any) => {
        const passwordHash = u.passwordHash || (u.password ? await bcrypt.hash(u.password, 10) : null);
        await prisma.user.create({
          data: {
            id: u.id,
            email: u.email ? u.email.trim() : null,
            passwordHash,
            name: u.name,
            role: u.role === 'admin' ? 'admin' : 'customer',
            phone: u.phone ? u.phone.trim() : null,
            avatar: u.avatar || null,
            rewardPoints: u.rewardPoints || 0,
            walletBalance: u.walletBalance || 0.0,
            gender: u.gender || null,
            dob: u.dob || null,
            bloodGroup: u.bloodGroup || null,
            emergencyContact: u.emergencyContact || null,
            emailVerified: u.emailVerified || false,
            mobileVerified: u.mobileVerified || false,
            biometricsEnabled: u.biometricsEnabled || false,
            biometricCredentialId: u.biometricCredentialId || null,
          },
        });
      }));
    }

    // 5. AppSettings
    const settingsCount = await prisma.appSettings.count();
    if (settingsCount === 0) {
      logger.info('🌱 Seeding AppSettings in PostgreSQL...');
      await prisma.appSettings.create({
        data: {
          whatsappNotificationsEnabled: true,
        },
      });
    }

    // Save current hash on successful seeding
    if (currentHash) {
      try {
        fs.writeFileSync(hashFilePath, currentHash, 'utf8');
        logger.info('💾 Saved localdb checksum hash to disk');
      } catch (writeErr) {
        logger.error('Failed to write localdb hash to disk', writeErr as Error);
      }
    }

  } catch (err) {
    logger.error('Error seeding PostgreSQL from LocalDB', err as Error);
  }
}

/**
 * Initialize all application services
 * Call this on server startup (e.g., in layout.tsx or a startup API route)
 */
export async function initializeApplication() {
  logger.info('🚀 Initializing application...');

  try {
    // 1. Verify database connection
    logger.info('🔌 Connecting to PostgreSQL...');
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // 2. Seed PostgreSQL Catalog / Users if database is empty
    logger.info('🌱 Verifying collection seeds...');
    await seedPostgresFromLocalJSON();

    // 3. Clear cache on startup
    cache.clear();
    logger.info('🧹 Cache cleared');

    // 4. Log startup metrics
    logger.info('✨ Application initialized successfully', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.critical('Failed to initialize application', error as Error);
    throw error;
  }
}

/**
 * Health check endpoint
 * Call periodically to ensure system is healthy
 */
export async function healthCheck() {
  try {
    const [userCount, orderCount, productCount] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.product.count()
    ]);
    const cacheStats = cache.getStats();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: { users: userCount, orders: orderCount, products: productCount },
      cache: cacheStats,
      uptime: process.uptime()
    };
  } catch (error) {
    logger.error('Health check failed', error as Error);
    return {
      status: 'unhealthy',
      error: String(error)
    };
  }
}


/**
 * Graceful shutdown
 * Call on application shutdown to cleanup resources
 */
export async function gracefulShutdown() {
  logger.info('🛑 Shutting down application...');

  try {
    // Clear cache
    cache.clear();
    logger.info('Cache cleared');

    // Close database connections

    logger.info('✅ Application shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
  }
}

/**
 * Performance monitoring
 * Track key metrics for debugging
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // Keep only last 100 measurements
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1]
    };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [name] of this.metrics) {
      result[name] = this.getMetrics(name);
    }
    return result;
  }

  clear() {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Track API response times
 */
export function trackResponseTime(apiPath: string, responseTime: number) {
  performanceMonitor.recordMetric(`api_${apiPath}`, responseTime);
}
