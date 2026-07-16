import { NextResponse } from 'next/server';
import { connectMongo, MongooseUserActivity } from '@/db/mongodb';
import { logActivity } from '@/db/db';

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

    // Always log to local JSON DB first
    const localType = type === 'cart_add' ? 'add_to_cart' : 'wishlist_add';
    logActivity(userId, localType, { productId, productName: productName || '', quantity });

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    await connectMongo();
    await MongooseUserActivity.create({
      userId,
      type,
      productId,
      productName: productName || null,
      quantity: quantity || null
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[track/cart]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
