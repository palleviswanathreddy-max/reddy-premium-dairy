/**
 * Advanced Admin Dashboard Features
 * Analytics, reporting, and system management — backed by PostgreSQL/Prisma
 */

import { prisma } from '@/lib/prisma';
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
      const [totalUsers, totalOrders, totalProducts, lowStockItems, revenueAgg] = await Promise.all([
        prisma.user.count({ where: { role: 'customer' } }),
        prisma.order.count(),
        prisma.product.count(),
        prisma.product.count({ where: { stock: { lt: 10 } } }),
        prisma.order.aggregate({ _sum: { grandTotal: true } })
      ]);

      const totalRevenue = revenueAgg._sum.grandTotal || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalUsers,
        totalOrders,
        totalRevenue,
        avgOrderValue,
        totalProducts,
        lowStockItems,
        activeTickets: 0, // tickets table not yet migrated
        conversionRate: totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics', error as Error);
      return null;
    }
  }

  async getUserAnalytics(daysBack = 30): Promise<UserAnalytics | null> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      const [totalUsers, newUsers, activeUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: dateThreshold } } }),
        prisma.user.count({ where: { lastLoginAt: { gte: dateThreshold } } })
      ]);

      const usersByRoleRaw = await prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      });

      const usersByRole = usersByRoleRaw.reduce((acc: Record<string, number>, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {});

      return {
        totalUsers,
        newUsersThisMonth: newUsers,
        activeUsers,
        usersByRole,
        topLocations: [] // Would need address join — skipped for now
      };
    } catch (error) {
      logger.error('Failed to get user analytics', error as Error);
      return null;
    }
  }

  async getOrderAnalytics(daysBack = 30): Promise<OrderAnalytics | null> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      const [totalOrders, thisMonthOrders, revenueAgg] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: dateThreshold } } }),
        prisma.order.aggregate({ _sum: { grandTotal: true } })
      ]);

      const totalRevenue = revenueAgg._sum.grandTotal || 0;

      const statusGroupRaw = await prisma.order.groupBy({
        by: ['status'],
        _count: { status: true }
      });

      const orderStatus = statusGroupRaw.reduce((acc: Record<string, number>, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {});

      const paymentGroupRaw = await prisma.order.groupBy({
        by: ['paymentMethod'],
        _count: { paymentMethod: true }
      });

      const paymentMethods = paymentGroupRaw.reduce((acc: Record<string, number>, item) => {
        acc[item.paymentMethod] = item._count.paymentMethod;
        return acc;
      }, {});

      // Top products by number of order items
      const topProductsRaw = await prisma.orderItem.groupBy({
        by: ['productId'],
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 5
      });

      const topProducts = topProductsRaw.map(item => ({
        productId: item.productId,
        count: item._count.productId
      }));

      return {
        totalOrders,
        ordersThisMonth: thisMonthOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalRevenue,
        orderStatus,
        topProducts,
        paymentMethods
      };
    } catch (error) {
      logger.error('Failed to get order analytics', error as Error);
      return null;
    }
  }

  async getSystemHealth(): Promise<Record<string, any> | null> {
    try {
      const [users, products, orders, coupons, reviews] = await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.coupon.count(),
        prisma.review.count()
      ]);

      return {
        timestamp: new Date().toISOString(),
        database: 'connected',
        users,
        products,
        orders,
        coupons,
        reviews
      };
    } catch (error) {
      logger.error('Failed to get system health', error as Error);
      return null;
    }
  }
}

export const adminAnalytics = new AdminAnalytics();
