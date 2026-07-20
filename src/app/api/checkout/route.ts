/**
 * Checkout API
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
import { prisma } from '@/lib/prisma';

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

    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const timeline = [
      { status: 'Pending', time: new Date().toISOString(), done: true },
      { status: 'Confirmed', time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), done: true },
      { status: 'Packed', time: '', done: false },
      { status: 'Shipped', time: '', done: false },
      { status: 'Out for Delivery', time: '', done: false },
      { status: 'Delivered', time: '', done: false }
    ];

    const invoiceNumber = `INV-${new Date().getFullYear()}-${orderId.split('-').pop()}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create order and update stock atomically inside a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Lock and check stock of all products
      const productIds = (sanitized.items || []).map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const dbProductMap = new Map<string, any>(dbProducts.map((p) => [p.id, p]));

      for (const item of (sanitized.items || [])) {
        const prod = dbProductMap.get(item.productId);
        if (!prod) {
          throw new Error(`Product not found: ${item.name || item.productId}`);
        }
        if (prod.stock < (Number(item.quantity) || 1)) {
          throw new Error(`Insufficient stock for product: ${prod.name}`);
        }
      }

      // 2. Create the order
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          userId,
          subtotal: Number(sanitized.totalPrice) || 0,
          gstTotal: 0,
          deliveryCharges: 0,
          discount: 0,
          grandTotal: Number(sanitized.totalPrice) || 0,
          status: 'Pending',
          paymentMethod: sanitized.paymentMethod || 'COD',
          paymentStatus: 'Pending',
          deliveryAddress: sanitized.deliveryAddress || {},
          timeline,
          invoiceNumber,
          deliveryOtp,
          items: {
            create: (sanitized.items || []).map((item: any) => {
              const prod = dbProductMap.get(item.productId);
              return {
                productId: item.productId,
                sku: prod?.sku || item.sku || 'UNKNOWN',
                name: prod?.name || item.name || 'Unknown Product',
                price: Number(item.price) || Number(prod?.price) || 0,
                quantity: Number(item.quantity) || 1,
                gst: Number(item.gst) || Number(prod?.gst) || 0
              };
            })
          }
        }
      });

      // 3. Update stock levels
      for (const item of (sanitized.items || [])) {
        const prod = dbProductMap.get(item.productId)!;
        const nextStock = prod.stock - (Number(item.quantity) || 1);
        const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: nextStock, status: nextStatus }
        });
      }

      return createdOrder;
    });

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
          orderId: newOrder.id,
          message: 'Order placed successfully',
          estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      },
      {
        status: 201,
        headers: getRateLimitHeaders(result.remaining, result.resetTime)
      }
    );
  } catch (error: any) {
    if (error instanceof Error && (error.message.startsWith('Insufficient stock') || error.message.startsWith('Product not found'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    logger.error('Checkout error', error as Error, { userId: auth.userId });
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
