/**
 * Admin Dashboard Statistics API
 * Requires authentication + admin role
 * Only admins can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/middleware/auth';
import { adminAnalytics } from '@/utils/admin-analytics';
import { logger } from '@/utils/logger';
import { cache, CacheKeys } from '@/utils/cache';

async function handler(request: NextRequest, { auth }: any) {
  try {
    // Check for cached data first
    const cacheKey = CacheKeys.STATS('dashboard');
    const cachedStats = cache.get(cacheKey);

    if (cachedStats) {
      logger.info('Dashboard stats from cache', { userId: auth.userId });
      return NextResponse.json(
        { success: true, data: cachedStats, source: 'cache' },
        { status: 200 }
      );
    }

    // Fetch fresh data
    const [dashboardMetrics, userAnalytics, orderAnalytics, systemHealth] = await Promise.all([
      adminAnalytics.getDashboardMetrics(),
      adminAnalytics.getUserAnalytics(30),
      adminAnalytics.getOrderAnalytics(30),
      adminAnalytics.getSystemHealth()
    ]);

    const stats = {
      dashboard: dashboardMetrics,
      users: userAnalytics,
      orders: orderAnalytics,
      system: systemHealth,
      timestamp: new Date().toISOString()
    };

    // Cache for 5 minutes
    cache.set(cacheKey, stats, 5 * 60 * 1000);

    logger.info('Dashboard stats generated', { userId: auth.userId, role: auth.role });

    return NextResponse.json(
      { success: true, data: stats, source: 'fresh' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Dashboard stats error', error as Error, { userId: auth.userId });
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

// Protect with authentication + admin role only
export const GET = withRole('admin')(withAuth(handler));
