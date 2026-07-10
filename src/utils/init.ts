/**
 * Application Initialization Utilities
 * Initialize all advanced features on app startup
 */

import { createDatabaseIndexes, getDatabaseStats } from '@/db/optimization';
import { logger } from '@/utils/logger';
import { cache } from '@/utils/cache';

/**
 * Initialize all application services
 * Call this on server startup (e.g., in layout.tsx or a startup API route)
 */
export async function initializeApplication() {
  logger.info('🚀 Initializing application...');

  try {
    // 1. Create database indexes
    logger.info('📊 Setting up database indexes...');
    await createDatabaseIndexes();
    
    // 2. Verify database connection
    const dbStats = await getDatabaseStats();
    logger.info('✅ Database connected', dbStats ?? undefined);

    // 3. Clear cache on startup (optional)
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
    const stats = await getDatabaseStats();
    const cacheStats = cache.getStats();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: stats,
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

    // Close database connections (if using mongoose)
    // await mongoose.disconnect();

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
