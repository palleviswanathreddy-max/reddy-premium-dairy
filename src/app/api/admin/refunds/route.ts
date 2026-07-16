import { NextResponse } from 'next/server';
import { db, logActivity } from '@/db/db';

export const dynamic = 'force-dynamic';

// GET — list all orders that have refund info or are cancelled
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // 'Pending' | 'Completed' | 'Failed' | 'all'

    const orders = db.orders.getAll();
    let refundOrders = orders.filter(o =>
      o.status === 'Cancelled' || o.refundStatus
    );

    if (statusFilter && statusFilter !== 'all') {
      refundOrders = refundOrders.filter(o => o.refundStatus === statusFilter);
    }

    const result = refundOrders.map(o => {
      const user = db.users.getById(o.userId);
      return {
        orderId: o.id,
        userId: o.userId,
        customerName: user?.name || o.deliveryAddress.name,
        customerPhone: user?.phone || o.deliveryAddress.phone,
        grandTotal: o.grandTotal,
        paymentMethod: o.paymentMethod,
        cancellationReason: o.cancellationReason || '',
        refundStatus: o.refundStatus || 'Pending',
        refundAmount: o.refundAmount ?? o.grandTotal,
        createdAt: o.createdAt,
        items: o.items
      };
    });

    // Sort: Pending first, then newest
    result.sort((a, b) => {
      if (a.refundStatus === 'Pending' && b.refundStatus !== 'Pending') return -1;
      if (b.refundStatus === 'Pending' && a.refundStatus !== 'Pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      refunds: result,
      total: result.length,
      pending: result.filter(r => r.refundStatus === 'Pending').length
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

    const order = db.orders.getById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (action === 'approve') {
      updates.refundStatus = 'Completed';
      updates.paymentStatus = 'Refunded';
      updates.refundAmount = refundAmount ?? order.grandTotal;
    } else {
      updates.refundStatus = 'Failed';
    }

    if (adminNote) updates.cancellationReason = adminNote;

    const updatedOrder = db.orders.update(orderId, updates as Parameters<typeof db.orders.update>[1]);
    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: 'Order update failed' }, { status: 500 });
    }

    // Notify customer
    try {
      const notifTitle = action === 'approve' ? 'Refund Approved' : 'Refund Rejected';
      const notifMsg = action === 'approve'
        ? `Your refund of Rs. ${(refundAmount ?? order.grandTotal).toFixed(2)} for order ${orderId} has been approved.`
        : `Your refund request for order ${orderId} has been rejected. ${adminNote || ''}`;

      db.notifications.create({
        id: `NOT-${Date.now()}`,
        userId: order.userId,
        title: notifTitle,
        message: notifMsg,
        type: 'Payment Status',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } catch (notifErr) {
      console.error('[Refund] Notification failed:', notifErr);
    }

    logActivity(order.userId, 'payment', { orderId, event: `refund_${action}` });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
