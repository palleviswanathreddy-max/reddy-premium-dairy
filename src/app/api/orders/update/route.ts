import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerWhatsApp, sendPushNotification } from '@/lib/notifications';
import { sseManager } from '@/utils/events';


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

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, deliveryPartner: true }
    });

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
      const existingTimeline = (order.timeline as any[]) || [];
      const updatedTimeline = existingTimeline.map(step => {
        if (step.status === status) {
          return { ...step, done: true, time: new Date().toISOString() };
        }
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

      if (status === 'Out for Delivery') {
        updates.expectedDelivery = new Date(Date.now() + 15 * 60 * 1000);
      } else if (status === 'Delivered') {
        updates.paymentStatus = 'Paid';
        updates.deliveredAt = new Date();
      } else if (status === 'Cancelled' && order.status !== 'Cancelled') {
        // COD orders don't need a refund; online-paid orders do
        if (order.paymentMethod !== 'COD' && order.paymentStatus === 'Paid') {
          updates.paymentStatus = 'Refunded';
          if (!updates.refundStatus) updates.refundStatus = 'Pending';
          if (!updates.refundAmount) updates.refundAmount = order.grandTotal;
        } else {
          updates.paymentStatus = order.paymentStatus;
        }

        // Restore Product Stock Levels
        for (const item of order.items) {
          const prod = await prisma.product.findUnique({ where: { id: item.productId } });
          if (prod) {
            const nextStock = prod.stock + item.quantity;
            const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: nextStock, status: nextStatus }
            });
          }
        }
      } else if (status && status !== 'Cancelled' && order.status === 'Cancelled') {
        // Re-reduce Product Stock Levels if order is un-cancelled
        for (const item of order.items) {
          const prod = await prisma.product.findUnique({ where: { id: item.productId } });
          if (prod) {
            const nextStock = Math.max(0, prod.stock - item.quantity);
            const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: nextStock, status: nextStatus }
            });
          }
        }
      }
    }

    // Handle payment status update (can be independent of delivery status)
    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updates,
      include: { items: true, user: true, deliveryPartner: true }
    });

    // Build response object
    const orderResponse = {
      id: updatedOrder.id,
      userId: updatedOrder.userId,
      userName: updatedOrder.user.name,
      userEmail: updatedOrder.user.email,
      userPhone: updatedOrder.user.phone,
      subtotal: updatedOrder.subtotal,
      gstTotal: updatedOrder.gstTotal,
      deliveryCharges: updatedOrder.deliveryCharges,
      discount: updatedOrder.discount,
      grandTotal: updatedOrder.grandTotal,
      status: updatedOrder.status,
      paymentMethod: updatedOrder.paymentMethod,
      paymentStatus: updatedOrder.paymentStatus,
      deliverySlot: updatedOrder.deliverySlot,
      deliveryAddress: updatedOrder.deliveryAddress,
      giftMessage: updatedOrder.giftMessage,
      deliveryInstructions: updatedOrder.deliveryInstructions,
      deliveryOtp: updatedOrder.deliveryOtp,
      expectedDelivery: updatedOrder.expectedDelivery?.toISOString() || null,
      deliveredAt: updatedOrder.deliveredAt?.toISOString() || null,
      cancellationReason: updatedOrder.cancellationReason,
      refundStatus: updatedOrder.refundStatus,
      refundAmount: updatedOrder.refundAmount,
      subscriptionType: updatedOrder.subscriptionType,
      invoiceNumber: updatedOrder.invoiceNumber,
      timeline: updatedOrder.timeline,
      couponCode: updatedOrder.couponCode,
      createdAt: updatedOrder.createdAt.toISOString(),
      items: updatedOrder.items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        gst: item.gst
      })),
      deliveryPartner: updatedOrder.deliveryPartner ? {
        id: updatedOrder.deliveryPartner.id,
        name: updatedOrder.deliveryPartner.name,
        phone: updatedOrder.deliveryPartner.phone
      } : null
    };

    // Trigger WhatsApp & FCM notifications
    if (status) {
      let waEvent = status;
      if (status === 'Packed') waEvent = 'Order Packed';
      else if (status === 'Out for Delivery') waEvent = 'Out For Delivery';
      else if (status === 'Cancelled') waEvent = 'Order Cancelled';

      triggerWhatsApp(waEvent, orderResponse as any).catch((e: unknown) => console.error("WhatsApp status trigger failed:", e));


      const title = `Order Status: ${status}`;
      let notifBody = `Your order ${orderId} has been updated to ${status}.`;
      if (status === 'Confirmed') {
        notifBody = `Your order ${orderId} has been confirmed and is being packed.`;
      } else if (status === 'Out for Delivery') {
        notifBody = `Our delivery partner is on the way with your order ${orderId}!`;
      } else if (status === 'Delivered') {
        notifBody = `Your order ${orderId} has been delivered successfully. Thank you for choosing us!`;
      }
      sendPushNotification(order.userId, title, notifBody).catch((e: unknown) => console.error("FCM Send failed:", e));

    }

    if (paymentStatus === 'Paid' && order.paymentStatus !== 'Paid') {
      triggerWhatsApp('Payment Successful', orderResponse as any).catch((e: unknown) => console.error("WhatsApp payment trigger failed:", e));

    }

    // Activity logging
    if (status) {
      if (status === 'Cancelled') {
        await prisma.activityLog.create({
          data: {
            userId: order.userId,
            type: 'cancel_order',
            meta: { orderId, reason: cancellationReason || 'No reason provided' }
          }
        });

        // Admin notification for cancellation
        try {
          const adminUsers = await prisma.user.findMany({ where: { role: 'admin' } });
          if (adminUsers.length > 0) {
            await prisma.notification.createMany({
              data: adminUsers.map(admin => ({
                userId: admin.id,
                title: 'Order Cancelled',
                message: `Order ${orderId} was cancelled${cancellationReason ? ': ' + cancellationReason : ''}.`,
                type: 'Order Updates',
                isRead: false
              }))
            });
          }
        } catch (e) { console.error('[Admin cancel notification]', e); }

      } else if (status === 'Delivered') {
        await prisma.activityLog.create({
          data: {
            userId: order.userId,
            type: 'payment',
            meta: { orderId, event: 'delivered' }
          }
        });

        // Free up delivery partner if assigned
        if (order.deliveryPartnerId) {
          const partner = await prisma.deliveryPartner.findUnique({ where: { id: order.deliveryPartnerId } });
          if (partner) {
            await prisma.deliveryPartner.update({
              where: { id: partner.id },
              data: {
                currentOrderId: null,
                completedDeliveries: partner.completedDeliveries + 1
              }
            });
          }
        }
      }
    }

    if (refundStatus === 'Completed' && order.refundStatus !== 'Completed') {
      triggerWhatsApp('Refund Processed', orderResponse as any).catch((e: unknown) => console.error('WhatsApp refund trigger failed:', e));

    }

    // Broadcast SSE event
    sseManager.broadcast('order_updated', orderResponse);

    return NextResponse.json(
      { success: true, order: orderResponse },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
