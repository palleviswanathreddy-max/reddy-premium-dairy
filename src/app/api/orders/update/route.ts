import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, status, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Order ID is required' }, { status: 400 });
    }

    if (!status && !paymentStatus) {
      return NextResponse.json({ success: false, message: 'At least status or paymentStatus is required' }, { status: 400 });
    }

    const order = db.orders.getById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const updates: any = {};

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
        
        if (stepIdx < currentIdx && !step.done) {
          return { ...step, done: true, time: new Date().toISOString() };
        }
        return step;
      });

      updates.status = status;
      updates.timeline = updatedTimeline;

      // Auto-mark as paid when delivered
      if (status === 'Delivered') {
        updates.paymentStatus = 'Paid';
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
