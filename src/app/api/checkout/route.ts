/**
 * Advanced Example: Checkout API
 * Demonstrates:
 * - Rate limiting
 * - Input validation
 * - Authentication
 * - Error handling
 * - Logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { validateInput, sanitizeInput, orderSchema } from '@/middleware/validation';
import { authRateLimiter, getRateLimitHeaders } from '@/middleware/rateLimiter';
import { logger } from '@/utils/logger';
import { cache, CacheKeys } from '@/utils/cache';
import { connectMongo } from '@/db/mongodb';

async function handler(request: NextRequest, { auth }: any) {
  try {
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Rate limit per user
    const userId = auth.userId;
    const result = authRateLimiter(userId);

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', { userId, endpoint: '/api/checkout' });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(result.remaining, result.resetTime)
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const sanitized = sanitizeInput(body);

    const { valid, errors } = validateInput(sanitized, orderSchema);

    if (!valid) {
      logger.warn('Validation failed for checkout', { userId, errors });
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Process checkout
    const connection = await connectMongo();
    const db = connection.connection.db;

    // Get user data
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create order
    const orderId = `ORD-${Date.now()}`;
    const order = {
      orderId,
      userId,
      items: sanitized.items,
      totalPrice: sanitized.totalPrice,
      deliveryAddress: sanitized.deliveryAddress,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('orders').insertOne(order);

    // Invalidate user's order cache
    cache.invalidatePattern(`orders:${userId}`);

    logger.info('Order created successfully', {
      userId,
      orderId,
      totalPrice: sanitized.totalPrice
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId,
          message: 'Order placed successfully',
          estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      },
      {
        status: 201,
        headers: getRateLimitHeaders(result.remaining, result.resetTime)
      }
    );
  } catch (error) {
    logger.error('Checkout error', error as Error, { userId: auth.userId });
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
