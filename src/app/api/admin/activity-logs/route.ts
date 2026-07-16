import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { connectMongo, MongooseUserActivity } from '@/db/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
    const skip = (page - 1) * limit;

    // 1. Try MongoDB for activity logs (UserActivity schema)
    let mongoLogs: Array<{
      type: string;
      productId: string | null;
      productName: string | null;
      orderId: string | null;
      createdAt: Date;
    }> = [];
    if (process.env.MONGODB_URI && userId) {
      try {
        await connectMongo();
        mongoLogs = await MongooseUserActivity.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      } catch (mongoErr) {
        console.warn('[ActivityLogs] MongoDB unavailable, using local DB:', mongoErr);
      }
    }

    // 2. Local DB activity logs
    let localLogs = userId
      ? db.activityLogs.getByUserId(userId, 500)
      : db.activityLogs.getAll();

    // Apply pagination to local logs
    const total = localLogs.length;
    localLogs = localLogs.slice(skip, skip + limit);

    // Format local logs the same as Mongo logs
    const formattedLocal = localLogs.map(l => ({
      id: l.id,
      type: l.type,
      meta: l.meta || {},
      createdAt: l.createdAt,
      source: 'local'
    }));

    const formattedMongo = mongoLogs.map((l: any) => ({
      id: l._id?.toString() || `mongo-${Date.now()}`,
      type: l.type,
      meta: {
        productId: l.productId,
        productName: l.productName,
        orderId: l.orderId,
        quantity: l.quantity,
        amount: l.amount
      },
      createdAt: l.createdAt?.toISOString?.() || new Date().toISOString(),
      source: 'mongodb'
    }));

    // Merge and sort by date, deduplicate by type+date proximity
    const combined = [...formattedMongo, ...formattedLocal]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      activity: combined,
      total: total + mongoLogs.length,
      page,
      limit
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
