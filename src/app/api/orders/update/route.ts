import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { orderId, status } = await request.json();
    if (!orderId || !status) {
      return NextResponse.json({ success: false, message: 'Order ID and status are required' }, { status: 400 });
    }

    const order = db.orders.getById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

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

    const updates: any = {
      status,
      timeline: updatedTimeline
    };

    if (status === 'Delivered') {
      updates.paymentStatus = 'Paid';
    }

    const updatedOrder = db.orders.update(orderId, updates);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
