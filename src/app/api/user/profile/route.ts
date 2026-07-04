/**
 * User Profile API Route
 * Requires authentication - any logged-in user can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { connectMongo } from '@/db/mongodb';

async function handler(request: NextRequest, { auth }: any) {
  try {
    if (request.method === 'GET') {
      // Get user profile
      const connection = await connectMongo();
      const db = connection.connection.db;

      const user = await db.collection('users').findOne(
        { id: auth.userId },
        { projection: { password: 0 } }
      );

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      logger.info('User profile retrieved', { userId: auth.userId });

      return NextResponse.json({ success: true, data: user }, { status: 200 });
    }

    if (request.method === 'PUT') {
      // Update user profile
      const body = await request.json();
      const connection = await connectMongo();
      const db = connection.connection.db;

      const result = await db.collection('users').updateOne(
        { id: auth.userId },
        {
          $set: {
            name: body.name,
            phone: body.phone,
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

      logger.info('User profile updated', { userId: auth.userId });

      return NextResponse.json(
        { success: true, message: 'Profile updated' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  } catch (error) {
    logger.error('Profile endpoint error', error as Error, { userId: auth.userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Protect with authentication - any logged-in user
export const GET = withAuth(handler);
export const PUT = withAuth(handler);
