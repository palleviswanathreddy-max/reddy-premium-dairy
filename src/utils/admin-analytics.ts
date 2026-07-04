/**
 * Advanced Admin Dashboard Features
 * Analytics, reporting, and system management
 */

import { connectMongo } from '@/db/mongodb';
import { logger } from '@/utils/logger';

export interface DashboardMetrics {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalProducts: number;
  lowStockItems: number;
  activeTickets: number;
  conversionRate: number;
}

export interface UserAnalytics {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  topLocations: Array<{ location: string; count: number }>;
}

export interface OrderAnalytics {
  totalOrders: number;
  ordersThisMonth: number;
  averageOrderValue: number;
  totalRevenue: number;
  orderStatus: Record<string, number>;
  topProducts: Array<{ productId: string; count: number }>;
  paymentMethods: Record<string, number>;
}

/**
 * Dashboard Statistics Service
 */
export class AdminAnalytics {
  async getDashboardMetrics(): Promise<DashboardMetrics | null> {
    try {
      const connection = await connectMongo();
      const db = connection.connection.db;

      if (!db) return null;

      const [
        totalUsers,
        totalOrders,
        totalProducts,
        orders,
        lowStockProducts,
        activeTickets
      ] = await Promise.all([
        db.collection('users').countDocuments(),
        db.collection('orders').countDocuments(),
        db.collection('products').countDocuments(),
        db.collection('orders')
          .find({})
          .project({ total: 1 })
          .toArray(),
        db.collection('products').countDocuments({ stock: { $lt: 10 } }),
        db.collection('tickets').countDocuments({ status: { $ne: 'closed' } })
      ]);

      const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalUsers,
        totalOrders,
        totalRevenue,
        avgOrderValue,
        totalProducts,
        lowStockItems: lowStockProducts,
        activeTickets,
        conversionRate: totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics', error as Error);
      return null;
    }
  }

  async getUserAnalytics(daysBack = 30): Promise<UserAnalytics | null> {
    try {
      const connection = await connectMongo();
      const db = connection.connection.db;

      if (!db) return null;

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      const [
        totalUsers,
        newUsers,
        activeUsers,
        usersByRole,
        topLocations
      ] = await Promise.all([
        db.collection('users').countDocuments(),
        db.collection('users').countDocuments({ createdAt: { $gte: dateThreshold } }),
        db.collection('users').countDocuments({ lastLogin: { $gte: dateThreshold } }),
        db.collection('users').aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray(),
        db.collection('users').aggregate([
          { $group: { _id: '$address.city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]).toArray()
      ]);

      const roleMap = usersByRole.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {});

      const locations = topLocations.map((item: any) => ({
        location: item._id,
        count: item.count
      }));

      return {
        totalUsers,
        newUsersThisMonth: newUsers,
        activeUsers,
        usersByRole: roleMap,
        topLocations: locations
      };
    } catch (error) {
      logger.error('Failed to get user analytics', error as Error);
      return null;
    }
  }

  async getOrderAnalytics(daysBack = 30): Promise<OrderAnalytics | null> {
    try {
      const connection = await connectMongo();
      const db = connection.connection.db;

      if (!db) return null;

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      const [
        totalOrders,
        thisMonthOrders,
        revenue,
        orderStatus,
        topProducts,
        paymentMethods
      ] = await Promise.all([
        db.collection('orders').countDocuments(),
        db.collection('orders').countDocuments({ createdAt: { $gte: dateThreshold } }),
        db.collection('orders')
          .aggregate([
            { $group: { _id: null, total: { $sum: '$total' } } }
          ])
          .toArray(),
        db.collection('orders')
          .aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ])
          .toArray(),
        db.collection('orders')
          .aggregate([
            { $unwind: '$items' },
            { $group: { _id: '$items.productId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ])
          .toArray(),
        db.collection('orders')
          .aggregate([
            { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
          ])
          .toArray()
      ]);

      const totalRevenue = revenue[0]?.total || 0;
      const statusMap = orderStatus.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      const paymentMap = paymentMethods.reduce((acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      const top = topProducts.map((item: any) => ({
        productId: item._id,
        count: item.count
      }));

      return {
        totalOrders,
        ordersThisMonth: thisMonthOrders,
        averageOrderValue: thisMonthOrders > 0 ? totalRevenue / thisMonthOrders : 0,
        totalRevenue,
        orderStatus: statusMap,
        topProducts: top,
        paymentMethods: paymentMap
      };
    } catch (error) {
      logger.error('Failed to get order analytics', error as Error);
      return null;
    }
  }

  async getSystemHealth(): Promise<Record<string, any> | null> {
    try {
      const connection = await connectMongo();
      const db = connection.connection.db;

      if (!db) return null;

      const collections = ['users', 'products', 'orders', 'coupons', 'tickets'];
      const health: Record<string, any> = {
        timestamp: new Date().toISOString(),
        database: 'connected'
      };

      for (const collection of collections) {
        const col = db.collection(collection);
        health[collection] = await col.countDocuments();
      }

      return health;
    } catch (error) {
      logger.error('Failed to get system health', error as Error);
      return null;
    }
  }
}

export const adminAnalytics = new AdminAnalytics();
