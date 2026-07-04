/**
 * User Management - Admin Only
 * Examples:
 * - GET: List users (admin)
 * - PUT: Update user (admin)
 * - DELETE: Remove user (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { connectMongo } from '@/db/mongodb';
import { cache, CacheKeys } from '@/utils/cache';

async function listUsers(request: NextRequest, { auth }: any) {
  try {
    const connection = await connectMongo();
    const db = connection.connection.db;

    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const users = await db
      .collection('users')
      .find({}, { projection: { password: 0 } })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('users').countDocuments();

    logger.info('Users listed', { adminId: auth.userId, count: users.length });

    return NextResponse.json(
      {
        success: true,
        data: users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('List users error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

async function updateUser(request: NextRequest, { auth }: any) {
  try {
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const connection = await connectMongo();
    const db = connection.connection.db;

    const result = await db.collection('users').updateOne(
      { id: userId },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Invalidate cache
    cache.delete(CacheKeys.USER(userId));

    logger.info('User updated by admin', {
      adminId: auth.userId,
      userId,
      updates: Object.keys(updates)
    });

    return NextResponse.json(
      { success: true, message: 'User updated' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update user error', error as Error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

async function deleteUser(request: NextRequest, { auth }: any) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await connectMongo();
    const db = connection.connection.db;

    // Prevent admin from deleting themselves
    if (userId === auth.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      );
    }

    const result = await db.collection('users').deleteOne({ id: userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Invalidate cache
    cache.delete(CacheKeys.USER(userId));

    logger.info('User deleted by admin', {
      adminId: auth.userId,
      deletedUserId: userId
    });

    return NextResponse.json(
      { success: true, message: 'User deleted' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Delete user error', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

// Export handlers with admin role protection
export const GET = withRole('admin')(withAuth(listUsers));
export const PUT = withRole('admin')(withAuth(updateUser));
export const DELETE = withRole('admin')(withAuth(deleteUser));
