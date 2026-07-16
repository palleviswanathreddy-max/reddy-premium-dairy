import { NextResponse } from 'next/server';
import { connectMongo, MongooseUserActivity } from '@/db/mongodb';
import { logActivity } from '@/db/db';

/**
 * POST /api/track/purchase
 * Logs a completed purchase event.
 * Body: { userId, orderId, items: [{productId, productName, quantity, price}] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, orderId, items } = body;

    if (!userId || !orderId || !items?.length) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Always log to local JSON DB first
    items.forEach((item: any) => {
      logActivity(userId, 'order_placed', {
        orderId,
        productId: item.productId,
        productName: item.productName || item.name || '',
        quantity: item.quantity,
        amount: item.price * item.quantity
      });
    });

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    await connectMongo();

    // Log one activity record per item in the order
    const activities = items.map((item: any) => ({
      userId,
      type: 'purchase',
      productId: item.productId,
      productName: item.productName || item.name || null,
      orderId,
      quantity: item.quantity,
      amount: item.price * item.quantity
    }));

    await MongooseUserActivity.insertMany(activities);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[track/purchase]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
