import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/customers/[id]/activity
 * Returns the full activity timeline for one customer using Prisma.
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

    // Build where clause
    const where: any = { userId: id };
    if (typeFilter && ['view_product', 'add_to_cart', 'remove_from_cart', 'wishlist_add', 'wishlist_remove', 'order_placed', 'payment', 'cancel_order', 'login', 'logout', 'register'].includes(typeFilter)) {
      where.type = typeFilter;
    }

    const [activityLogs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.activityLog.count({ where })
    ]);

    type DbActivityLog = typeof activityLogs[number];
    const activity = activityLogs.map((log: DbActivityLog) => ({
      id: log.id,
      userId: log.userId,
      type: log.type,
      meta: log.meta,
      createdAt: log.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, activity, total, page, limit });
  } catch (err: any) {
    console.error('[admin/customers/[id]/activity]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
