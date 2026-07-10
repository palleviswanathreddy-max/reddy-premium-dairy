import { NextResponse } from 'next/server';
import { connectMongo, MongooseUserActivity } from '@/db/mongodb';
import { db } from '@/db/db';

/**
 * GET /api/admin/customers/[id]/activity
 * Returns the full activity timeline for one customer.
 * Query params: ?limit=50&page=1&type=view|cart_add|purchase
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const typeFilter = searchParams.get('type');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Customer ID required' }, { status: 400 });
    }

    // Fallback for local-DB setups (no activity data stored)
    if (!process.env.MONGODB_URI) {
      const localOrders = db.orders.getByUserId(id);
      const syntheticActivity = localOrders.flatMap(order =>
        order.items.map(item => ({
          _id: `${order.id}-${item.productId}`,
          userId: id,
          type: 'purchase',
          productId: item.productId,
          productName: item.name,
          orderId: order.id,
          quantity: item.quantity,
          amount: item.price * item.quantity,
          createdAt: order.createdAt
        }))
      );
      return NextResponse.json({
        success: true,
        activity: syntheticActivity,
        total: syntheticActivity.length,
        note: 'MongoDB not connected — showing order history only'
      });
    }

    await connectMongo();

    const query: any = { userId: id };
    if (typeFilter && ['view', 'cart_add', 'wishlist_add', 'purchase', 'login'].includes(typeFilter)) {
      query.type = typeFilter;
    }

    const [activity, total] = await Promise.all([
      MongooseUserActivity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MongooseUserActivity.countDocuments(query)
    ]);

    return NextResponse.json({ success: true, activity, total, page, limit });
  } catch (err: any) {
    console.error('[admin/customers/[id]/activity]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
