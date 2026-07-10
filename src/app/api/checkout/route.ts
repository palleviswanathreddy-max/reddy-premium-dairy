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
import { cache } from '@/utils/cache';
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

    // Process checkout - try MongoDB first, then fallback to localdb
    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderData = {
      orderId,
      userId,
      items: sanitized.items,
      totalPrice: sanitized.totalPrice,
      deliveryAddress: sanitized.deliveryAddress,
      status: 'Pending',
      paymentStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Try MongoDB
    if (process.env.MONGODB_URI) {
      try {
        const connection = await connectMongo();
        const mongoDb = connection.connection.db;
        await mongoDb.collection('orders').insertOne(orderData);
      } catch (mongoErr) {
        logger.warn('MongoDB order insert failed, using localdb fallback', { error: (mongoErr as Error).message });
      }
    }

    // Always also save to localdb.json for admin portal consistency
    try {
      const { db: localDb } = await import('@/db/db');
      const timeline = [
        { status: 'Pending', time: new Date().toISOString(), done: true },
        { status: 'Confirmed', time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), done: true },
        { status: 'Packed', time: '', done: false },
        { status: 'Shipped', time: '', done: false },
        { status: 'Out for Delivery', time: '', done: false },
        { status: 'Delivered', time: '', done: false }
      ];
      localDb.orders.create({
        id: orderId,
        userId,
        items: sanitized.items || [],
        subtotal: sanitized.totalPrice || 0,
        gstTotal: 0,
        deliveryCharges: 0,
        discount: 0,
        grandTotal: sanitized.totalPrice || 0,
        status: 'Pending',
        paymentMethod: sanitized.paymentMethod || 'COD',
        paymentStatus: 'Pending',
        deliveryAddress: sanitized.deliveryAddress || {},
        createdAt: new Date().toISOString(),
        timeline
      });
    } catch (localErr) {
      logger.warn('LocalDB order save failed', { error: (localErr as Error).message });
    }

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
