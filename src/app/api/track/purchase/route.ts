import { NextResponse } from 'next/server';
import { connectMongo, MongooseUserActivity } from '@/db/mongodb';

/**
 * POST /api/track/purchase
 * Logs a completed purchase event.
 * Body: { userId, orderId, items: [{productId, productName, quantity, price}], grandTotal }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, orderId, items, grandTotal } = body;

    if (!userId || !orderId || !items?.length) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ success: true, skipped: true });
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
