import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(_request: Request) {
  try {
    // In a real app, you would authenticate the delivery executive via session.
    // Here we'll just return all orders that are active.
    
    let orders = db.orders.getAll();
    
    // Filter for orders that are not fully delivered or cancelled
    orders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
    
    // Sort by createdAt descending
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { orderId, action } = await request.json();
    
    const order = db.orders.getById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Process actions
    if (action === 'MARK_DELIVERED') {
      order.status = 'Delivered';
      order.paymentStatus = 'Paid'; // Assuming cash collected if COD
      
      // Update timeline
      for (const step of order.timeline) {
        if (!step.done) {
          step.done = true;
          step.time = new Date().toISOString();
        }
      }

      db.orders.update(orderId, order);
      return NextResponse.json({ success: true, order });
    }

    if (action === 'MARK_OUT_FOR_DELIVERY') {
      order.status = 'Out for Delivery';
      
      // Update timeline
      const stepIndex = order.timeline.findIndex(s => s.status === 'Out for Delivery');
      if (stepIndex !== -1) {
        order.timeline[stepIndex].done = true;
        order.timeline[stepIndex].time = new Date().toISOString();
      }

      db.orders.update(orderId, order);
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
