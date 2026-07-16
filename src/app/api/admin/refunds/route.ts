import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — list all orders that have refund info or are cancelled
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // 'Pending' | 'Completed' | 'Failed' | 'all'

    const where: any = {
      OR: [
        { status: 'Cancelled' },
        { refundStatus: { not: null } }
      ]
    };

    if (statusFilter && statusFilter !== 'all') {
      where.refundStatus = statusFilter;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    type DbRefundOrder = typeof orders[number];
    const result = orders.map((o: DbRefundOrder) => {
      const deliveryAddr = o.deliveryAddress as any;
      return {
        orderId: o.id,
        userId: o.userId,
        customerName: o.user?.name || deliveryAddr?.name || '',
        customerPhone: o.user?.phone || deliveryAddr?.phone || '',
        grandTotal: o.grandTotal,
        paymentMethod: o.paymentMethod,
        cancellationReason: o.cancellationReason || '',
        refundStatus: o.refundStatus || 'Pending',
        refundAmount: o.refundAmount ?? o.grandTotal,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((item: any) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      };
    });

    // Sort: Pending first, then newest
    result.sort((a: any, b: any) => {
      if (a.refundStatus === 'Pending' && b.refundStatus !== 'Pending') return -1;
      if (b.refundStatus === 'Pending' && a.refundStatus !== 'Pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      refunds: result,
      total: result.length,
      pending: result.filter((r: any) => r.refundStatus === 'Pending').length
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// POST — approve or reject a refund
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, action, refundAmount, adminNote } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { success: false, message: 'orderId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'action must be approve or reject' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const updates: any = {};

    if (action === 'approve') {
      updates.refundStatus = 'Completed';
      updates.paymentStatus = 'Refunded';
      updates.refundAmount = refundAmount ?? order.grandTotal;
    } else {
      updates.refundStatus = 'Failed';
    }

    if (adminNote) updates.cancellationReason = adminNote;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updates
    });

    // Notify customer
    try {
      const notifTitle = action === 'approve' ? 'Refund Approved' : 'Refund Rejected';
      const refundAmt = refundAmount ?? order.grandTotal;
      const notifMsg = action === 'approve'
        ? `Your refund of Rs. ${Number(refundAmt).toFixed(2)} for order ${orderId} has been approved.`
        : `Your refund request for order ${orderId} has been rejected. ${adminNote || ''}`;

      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: notifTitle,
          message: notifMsg,
          type: 'Payment Status',
          isRead: false
        }
      });
    } catch (notifErr) {
      console.error('[Refund] Notification failed:', notifErr);
    }

    await prisma.activityLog.create({
      data: {
        userId: order.userId,
        type: 'payment',
        meta: { orderId, event: `refund_${action}` }
      }
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
