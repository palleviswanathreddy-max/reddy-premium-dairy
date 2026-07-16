/**
 * User Management - Admin Only
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import { cache, CacheKeys } from '@/utils/cache';

async function listUsers(request: NextRequest, { auth }: any) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        omit: { passwordHash: true },
        include: {
          addresses: { select: { id: true } },
          orders: { select: { id: true } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);

    type UserListItem = typeof users[number];
    const data = users.map((u: UserListItem) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      walletBalance: u.walletBalance,
      rewardPoints: u.rewardPoints,
      emailVerified: u.emailVerified,
      mobileVerified: u.mobileVerified,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      addressCount: u.addresses.length,
      orderCount: u.orders.length
    }));

    logger.info('Users listed', { adminId: auth.userId, count: data.length });

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('List users error', error as Error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

async function updateUser(request: NextRequest, { auth }: any) {
  try {
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Strip fields that shouldn't be set via admin update
    delete updates.passwordHash;
    delete updates.id;

    await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    cache.delete(CacheKeys.USER(userId));

    logger.info('User updated by admin', {
      adminId: auth.userId,
      userId,
      updates: Object.keys(updates)
    });

    return NextResponse.json({ success: true, message: 'User updated' }, { status: 200 });
  } catch (error) {
    logger.error('Update user error', error as Error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

async function deleteUser(request: NextRequest, { auth }: any) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === auth.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: userId } });

    cache.delete(CacheKeys.USER(userId));

    logger.info('User deleted by admin', {
      adminId: auth.userId,
      deletedUserId: userId
    });

    return NextResponse.json({ success: true, message: 'User deleted' }, { status: 200 });
  } catch (error) {
    logger.error('Delete user error', error as Error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

// Export handlers with admin role protection
export const GET = withRole('admin')(withAuth(listUsers));
export const PUT = withRole('admin')(withAuth(updateUser));
export const DELETE = withRole('admin')(withAuth(deleteUser));
