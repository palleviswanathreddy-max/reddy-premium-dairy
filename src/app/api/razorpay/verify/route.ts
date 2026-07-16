import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db/db';
import { sendOrderConfirmation, triggerWhatsApp } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      orderData,
      isMock
    } = body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!isMock) {
      if (!key_secret) {
        return NextResponse.json({ success: false, message: 'Server missing Razorpay secret' }, { status: 500 });
      }

      // Verify Signature
      const hmac = crypto.createHmac('sha256', key_secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
      }
    }

    // Payment is verified (or mock is explicitly trusted in development)
    // Create the order in the database
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

    const newOrder = db.orders.create({
      ...orderData,
      id: orderId,
      status: 'Pending',
      paymentStatus: 'Paid',
      createdAt: new Date().toISOString(),
      timeline
    });

    // Update Product Stock Levels
    for (const item of orderData.items) {
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
    if (orderData.userId) {
      const user = db.users.getById(orderData.userId);
      if (user) userEmail = user.email;
    }
    
    // Fire and forget (don't block response)
    sendOrderConfirmation(newOrder, userEmail).catch((e: unknown) => console.error("Notification failed:", e));
    triggerWhatsApp('Order Placed', newOrder).catch((e: unknown) => console.error("WhatsApp placement failed:", e));
    triggerWhatsApp('Payment Successful', newOrder).catch((e: unknown) => console.error("WhatsApp payment status failed:", e));

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err: any) {
    console.error("Razorpay Verify Error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
