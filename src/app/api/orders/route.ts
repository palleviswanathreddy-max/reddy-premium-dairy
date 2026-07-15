import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sendOrderConfirmation } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    let orders = db.orders.getAll();

    if (role !== 'admin') {
      if (userId) {
        orders = orders.filter(o => o.userId === userId);
      } else {
        orders = [];
      }
    }

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Create timeline
    const timeline = [
      { status: 'Pending', time: new Date().toISOString(), done: true },
      { status: 'Confirmed', time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), done: true },
      { status: 'Packed', time: '', done: false },
      { status: 'Shipped', time: '', done: false },
      { status: 'Out for Delivery', time: '', done: false },
      { status: 'Delivered', time: '', done: false }
    ];

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder = db.orders.create({
      ...body,
      id: orderId,
      status: 'Pending',
      paymentStatus: body.paymentMethod === 'COD' ? 'Pending' : 'Paid',
      createdAt: new Date().toISOString(),
      timeline,
      deliveryOtp
    });

    // Update Product Stock Levels
    for (const item of body.items) {
      const prod = db.products.getById(item.productId);
      if (prod) {
        const nextStock = Math.max(0, prod.stock - item.quantity);
        const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
        db.products.update(item.productId, {
          stock: nextStock,
          status: nextStatus
        });
      }
    }

    // Trigger Notification
    let userEmail;
    if (body.userId) {
      const user = db.users.getById(body.userId);
      if (user) userEmail = user.email;
    }
    
    // Fire and forget (don't block response)
    sendOrderConfirmation(newOrder, userEmail).catch((e: any) => console.error("Notification failed:", e));
    const { triggerWhatsApp } = require('@/lib/notifications');
    triggerWhatsApp('Order Placed', newOrder).catch((e: any) => console.error("WhatsApp placement failed:", e));

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
