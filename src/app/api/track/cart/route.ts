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

    if (!userId || !type) {
      return NextResponse.json({ success: false, message: 'userId and type are required' }, { status: 400 });
    }

    const validTypes = ['cart_add', 'wishlist_add', 'login'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });
    }

    if (type !== 'login' && !productId) {
      return NextResponse.json({ success: false, message: 'productId is required' }, { status: 400 });
    }

    const logType = type === 'cart_add'
      ? 'add_to_cart'
      : type === 'wishlist_add'
        ? 'wishlist_add'
        : 'login';

    // Non-blocking write
    prisma.activityLog.create({
      data: {
        userId,
        type: logType,
        meta: type === 'login' ? {} : { productId, productName: productName || '', quantity }
      }
    }).catch((err: any) => console.error('[track/cart]', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[track/cart]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
