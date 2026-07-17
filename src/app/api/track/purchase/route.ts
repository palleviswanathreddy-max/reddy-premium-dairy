import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/track/purchase
 * Logs a completed purchase event to the ActivityLog.
 * Body: { userId, orderId, items: [{productId, productName, quantity, price}] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, orderId, items } = body;

    if (!userId || !orderId || !items?.length) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Log one activity entry per purchase
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'order_placed',
        meta: {
          orderId,
          items: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName || item.name || '',
            quantity: item.quantity,
            amount: item.price * item.quantity
          }))
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[track/purchase]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
