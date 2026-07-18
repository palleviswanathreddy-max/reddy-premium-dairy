import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmation, triggerWhatsApp } from '@/lib/notifications';
import { sseManager } from '@/utils/events';

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

    // Payment is verified — create the order in PostgreSQL
    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const timeline = [
      { status: 'Pending', time: new Date().toISOString(), done: true },
      { status: 'Confirmed', time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), done: true },
      { status: 'Packed', time: '', done: false },
      { status: 'Shipped', time: '', done: false },
      { status: 'Out for Delivery', time: '', done: false },
      { status: 'Delivered', time: '', done: false }
    ];

    const invoiceNumber = `INV-${new Date().getFullYear()}-${orderId.split('-').pop()}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Resolve product details
    const productIds = (orderData.items || []).map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    type DbVerifyProduct = typeof products[number];
    const productMap = new Map<string, any>(products.map((p: DbVerifyProduct) => [p.id, p]));

    const newOrder = await prisma.order.create({
      data: {
        id: orderId,
        userId: orderData.userId,
        subtotal: Number(orderData.subtotal) || 0,
        gstTotal: Number(orderData.gstTotal) || 0,
        deliveryCharges: Number(orderData.deliveryCharges) || 0,
        discount: Number(orderData.discount) || 0,
        grandTotal: Number(orderData.grandTotal) || 0,
        status: 'Pending',
        paymentMethod: orderData.paymentMethod || 'Online',
        paymentStatus: 'Paid',
        deliverySlot: orderData.deliverySlot || null,
        deliveryAddress: orderData.deliveryAddress || {},
        giftMessage: orderData.giftMessage || null,
        deliveryInstructions: orderData.deliveryInstructions || null,
        deliveryOtp,
        subscriptionType: orderData.subscriptionType || 'One Time Order',
        invoiceNumber,
        timeline,
        couponCode: orderData.couponCode || null,
        items: {
          create: (orderData.items || []).map((item: any) => {
            const prod = productMap.get(item.productId);
            return {
              productId: item.productId,
              sku: prod?.sku || item.sku || 'UNKNOWN',
              name: prod?.name || item.name || 'Unknown Product',
              price: Number(item.price) || Number(prod?.price) || 0,
              quantity: Number(item.quantity) || 1,
              gst: Number(item.gst) || Number(prod?.gst) || 0
            };
          })
        }
      },
      include: { items: true, user: true }
    });

    // Record the payment
    if (razorpay_payment_id) {
      await prisma.payment.create({
        data: {
          orderId,
          paymentId: razorpay_payment_id || `mock_${Date.now()}`,
          method: orderData.paymentMethod || 'Online',
          status: 'Paid',
          amount: Number(orderData.grandTotal) || 0
        }
      });
    }

    // Update Product Stock Levels in database in a single transaction
    const stockUpdates = (orderData.items || []).map((item: any) => {
      const prod = productMap.get(item.productId);
      if (prod) {
        const nextStock = Math.max(0, prod.stock - (Number(item.quantity) || 1));
        const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
        return prisma.product.update({
          where: { id: item.productId },
          data: { stock: nextStock, status: nextStatus }
        });
      }
      return null;
    }).filter(Boolean);

    if (stockUpdates.length > 0) {
      await prisma.$transaction(stockUpdates as any);
    }


    // Activity logs
    if (orderData.userId) {
      await prisma.activityLog.createMany({
        data: [
          { userId: orderData.userId, type: 'order_placed', meta: { orderId, grandTotal: orderData.grandTotal } },
          { userId: orderData.userId, type: 'payment', meta: { orderId, method: orderData.paymentMethod, paymentId: razorpay_payment_id } }
        ]
      });
    }

    const orderResponse = {
      id: newOrder.id,
      userId: newOrder.userId,
      subtotal: newOrder.subtotal,
      gstTotal: newOrder.gstTotal,
      deliveryCharges: newOrder.deliveryCharges,
      discount: newOrder.discount,
      grandTotal: newOrder.grandTotal,
      status: newOrder.status,
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      deliverySlot: newOrder.deliverySlot,
      deliveryAddress: newOrder.deliveryAddress,
      invoiceNumber: newOrder.invoiceNumber,
      timeline: newOrder.timeline,
      createdAt: newOrder.createdAt.toISOString(),
      items: newOrder.items.map((item: any) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        gst: item.gst
      }))
    };

    // Fire and forget notifications
    const userEmail = newOrder.user?.email || undefined;
    sendOrderConfirmation(orderResponse as any, userEmail).catch((e: unknown) => console.error("Notification failed:", e));
    triggerWhatsApp('Order Placed', orderResponse as any).catch((e: unknown) => console.error("WhatsApp placement failed:", e));
    triggerWhatsApp('Payment Successful', orderResponse as any).catch((e: unknown) => console.error("WhatsApp payment status failed:", e));


    // Broadcast SSE event
    sseManager.broadcast('order_created', orderResponse);

    return NextResponse.json({ success: true, order: orderResponse });
  } catch (err: any) {
    console.error("Razorpay Verify Error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
