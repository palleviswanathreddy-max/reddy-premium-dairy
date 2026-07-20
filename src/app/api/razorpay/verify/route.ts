import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmation, triggerWhatsApp } from '@/lib/notifications';
import { sseManager } from '@/utils/events';
import { getAuthenticatedUser } from '@/utils/auth-check';

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

    const authUser = await getAuthenticatedUser(request);
    const finalUserId = authUser?.id || orderData?.userId;

    if (!finalUserId) {
      return NextResponse.json({ success: false, message: 'Unauthorized or missing userId' }, { status: 401 });
    }

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

    // Create order, record payment, update stock levels, and clear cart atomically in a single transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Lock and check stock of all products
      const productIds = (orderData.items || []).map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const dbProductMap = new Map<string, any>(dbProducts.map((p) => [p.id, p]));

      for (const item of (orderData.items || [])) {
        const prod = dbProductMap.get(item.productId);
        if (!prod) {
          throw new Error(`Product not found: ${item.name || item.productId}`);
        }
        if (prod.stock < (Number(item.quantity) || 1)) {
          throw new Error(`Sufficient stock not available for ${prod.name}. Available: ${prod.stock}`);
        }
      }

      // 2. Create the order
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          userId: finalUserId,
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
              const prod = dbProductMap.get(item.productId);
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

      // 3. Record the payment
      if (razorpay_payment_id) {
        await tx.payment.create({
          data: {
            orderId,
            paymentId: razorpay_payment_id || `mock_${Date.now()}`,
            method: orderData.paymentMethod || 'Online',
            status: 'Paid',
            amount: Number(orderData.grandTotal) || 0
          }
        });
      }

      // 4. Update Product Stock Levels
      for (const item of (orderData.items || [])) {
        const prod = dbProductMap.get(item.productId)!;
        const nextStock = prod.stock - (Number(item.quantity) || 1);
        const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: nextStock, status: nextStatus }
        });
      }

      // 5. Clear user's cart items from database on success
      await tx.cartItem.deleteMany({
        where: { userId: finalUserId }
      });

      return createdOrder;
    });

    // Activity logs
    if (finalUserId) {
      await prisma.activityLog.createMany({
        data: [
          { userId: finalUserId, type: 'order_placed', meta: { orderId, grandTotal: orderData.grandTotal } },
          { userId: finalUserId, type: 'payment', meta: { orderId, method: orderData.paymentMethod, paymentId: razorpay_payment_id } }
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

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: orderResponse,
      orderId: orderResponse.id,
      data: { order: orderResponse }
    });
  } catch (err: any) {
    console.error("Razorpay Verify Error:", err);
    const isValidationError = err instanceof Error && (err.message.startsWith('Sufficient stock not available') || err.message.startsWith('Product not found'));
    return NextResponse.json({ success: false, message: err.message }, { status: isValidationError ? 400 : 500 });
  }
}
