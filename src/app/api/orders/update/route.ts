import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, status, paymentStatus, cancellationReason, refundStatus, refundAmount } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Order ID is required' }, { status: 400 });
    }

    if (!status && !paymentStatus && !cancellationReason) {
      return NextResponse.json({ success: false, message: 'No fields to update' }, { status: 400 });
    }

    const order = db.orders.getById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const updates: any = {};

    if (cancellationReason) updates.cancellationReason = cancellationReason;
    if (refundStatus) updates.refundStatus = refundStatus;
    if (refundAmount) updates.refundAmount = Number(refundAmount);

    // Handle delivery status update
    if (status) {
      // Update timeline based on new status
      const updatedTimeline = order.timeline.map(step => {
        if (step.status === status) {
          return { ...step, done: true, time: new Date().toISOString() };
        }
        // If we mark something ahead, make sure previous steps are marked done too
        const statusOrder = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
        const currentIdx = statusOrder.indexOf(status);
        const stepIdx = statusOrder.indexOf(step.status);
        
        if (stepIdx < currentIdx && !step.done && currentIdx !== -1) {
          return { ...step, done: true, time: new Date().toISOString() };
        }
        return step;
      });

      updates.status = status;
      updates.timeline = updatedTimeline;

      // Auto-mark as paid when delivered, or refunded when cancelled
      if (status === 'Delivered') {
        updates.paymentStatus = 'Paid';
      } else if (status === 'Cancelled') {
        updates.paymentStatus = 'Refunded';
        if (!updates.refundStatus) updates.refundStatus = 'Completed';
        if (!updates.refundAmount) updates.refundAmount = order.grandTotal;
      }
    }

    // Handle payment status update (can be independent of delivery status)
    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
    }

    const updatedOrder = db.orders.update(orderId, updates);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
