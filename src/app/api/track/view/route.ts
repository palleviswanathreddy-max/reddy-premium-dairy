import { NextResponse } from 'next/server';
import { connectMongo, MongooseUserActivity } from '@/db/mongodb';

/**
 * POST /api/track/view
 * Logs a product view event.
 * Body: { userId, productId, productName, meta? }
 * Fire-and-forget from the client — always returns 200.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, productId, productName, meta } = body;

    if (!userId || !productId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (!process.env.MONGODB_URI) {
      // Activity tracking requires MongoDB — silently skip for local-DB setups
      return NextResponse.json({ success: true, skipped: true });
    }

    await connectMongo();
    await MongooseUserActivity.create({
      userId,
      type: 'view',
      productId,
      productName: productName || null,
      meta: meta || {}
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    // Never let a tracking failure surface to the user
    console.error('[track/view]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
