import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/track/view
 * Logs a product view event.
 * Body: { userId, productId, productName, meta? }
 * Fire-and-forget from the client — always returns 200.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, productId, productName } = body;

    if (!userId || !productId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Non-blocking write — don't await
    prisma.activityLog.create({
      data: {
        userId,
        type: 'view_product',
        meta: { productId, productName: productName || '' }
      }
    }).catch(err => console.error('[track/view]', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    // Never let a tracking failure surface to the user
    console.error('[track/view]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
