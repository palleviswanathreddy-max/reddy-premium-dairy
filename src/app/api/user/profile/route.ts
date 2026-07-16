/**
 * User Profile API Route
 * Requires authentication - any logged-in user can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';

async function handler(request: NextRequest, { auth }: any) {
  try {
    if (request.method === 'GET') {
      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        include: {
          addresses: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      logger.info('User profile retrieved', { userId: auth.userId });

      const { passwordHash: _, ...safeUser } = user;
      return NextResponse.json({ success: true, data: safeUser }, { status: 200 });
    }

    if (request.method === 'PUT') {
      // Update user profile
      const body = await request.json();

      const updatedUser = await prisma.user.update({
        where: { id: auth.userId },
        data: {
          name: body.name,
          phone: body.phone
        }
      });

      if (!updatedUser) {
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
