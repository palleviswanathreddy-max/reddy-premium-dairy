import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/track/cart
 * Logs a cart_add or wishlist_add event.
 * Body: { userId, type: 'cart_add'|'wishlist_add', productId, productName, quantity? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, productId, productName, quantity } = body;

    if (!userId || !productId || !type) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const validTypes = ['cart_add', 'wishlist_add'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });
    }

    const logType = type === 'cart_add' ? 'add_to_cart' : 'wishlist_add';

    // Non-blocking write
    prisma.activityLog.create({
      data: {
        userId,
        type: logType,
        meta: { productId, productName: productName || '', quantity }
      }
    }).catch((err: any) => console.error('[track/cart]', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[track/cart]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
