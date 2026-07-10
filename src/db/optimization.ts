/**
 * Database Optimization & Indexing
 * MongoDB indexes and query optimization
 */

import { connectMongo } from './mongodb';
import { logger } from '@/utils/logger';

export async function createDatabaseIndexes() {
  try {
    const connection = await connectMongo();
    const db = connection.connection.db;

    if (!db) {
      logger.warn('Could not access database for creating indexes');
      return;
    }

    // Users Collection Indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ 'address.pincode': 1 });

    // Products Collection Indexes
    await db.collection('products').createIndex({ sku: 1 }, { unique: true });
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ brand: 1 });
    await db.collection('products').createIndex({ status: 1 });
    await db.collection('products').createIndex({ 'price': 1 });
    await db.collection('products').createIndex({ 'rating': -1 });
    await db.collection('products').createIndex({ 'createdAt': -1 });
    // Compound index for common queries
    await db.collection('products').createIndex({ category: 1, status: 1 });
    await db.collection('products').createIndex({ brand: 1, category: 1 });

    // Orders Collection Indexes
    await db.collection('orders').createIndex({ userId: 1 });
    await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ 'paymentStatus': 1 });
    // Compound index for user order history
    await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });

    // Coupons Collection Indexes
    await db.collection('coupons').createIndex({ code: 1 }, { unique: true });
    await db.collection('coupons').createIndex({ validFrom: 1, validTo: 1 });
    await db.collection('coupons').createIndex({ isActive: 1 });

    // Tickets/Support Collection Indexes
    await db.collection('tickets').createIndex({ userId: 1 });
    await db.collection('tickets').createIndex({ status: 1 });
    await db.collection('tickets').createIndex({ createdAt: -1 });
    await db.collection('tickets').createIndex({ priority: 1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Failed to create database indexes', error as Error);
  }
}

/**
 * Query Performance Hints
 */
export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
  lean?: boolean; // Return plain objects instead of Mongoose documents
}

export function buildQueryOptions(options: QueryOptions) {
  return {
    ...options,
    lean: options.lean ?? true // Default to lean for better performance
  };
}

/**
 * Database Stats & Monitoring
 */
export async function getDatabaseStats() {
  try {
    const connection = await connectMongo();
    const db = connection.connection.db;

    if (!db) return null;

    const collections = ['users', 'products', 'orders', 'coupons', 'tickets'];
    const stats: Record<string, any> = {};

    for (const collection of collections) {
      try {
        const col = db.collection(collection);
        const count = await col.countDocuments();
        const indexes = await col.getIndexes();
        stats[collection] = { count, indexCount: Object.keys(indexes).length };
      } catch {
        stats[collection] = { error: 'Collection not found' };
      }
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get database stats', error as Error);
    return null;
  }
}

/**
 * Connection Pooling Configuration
 */
export const mongooseConnectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 45000,
  waitQueueTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // IPv4
};
