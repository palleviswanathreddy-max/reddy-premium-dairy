import { NextResponse } from 'next/server';
import { db, logActivity } from '@/db/db';
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

    const order = await db.orders.getById(orderId);
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
      if (status === 'Out for Delivery') {
        updates.deliveryPartner = {
          name: "Ramesh Kumar",
          phone: "+91 98765 43210",
          vehicle: "Hero Electric – AP 39 AB 1234",
          lat: 14.6186, // Chiyyedu Farm
          lng: 77.6358,
          destLat: 14.6819, // Destination Anantapur
          destLng: 77.6006,
          eta: "15 mins"
        };
        updates.expectedDelivery = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      } else if (status === 'Delivered') {
        updates.paymentStatus = 'Paid';
        updates.deliveredAt = new Date().toISOString();
        if (order.deliveryPartner) {
          updates.deliveryPartner = {
            ...order.deliveryPartner,
            lat: order.deliveryPartner.destLat || 14.6819,
            lng: order.deliveryPartner.destLng || 77.6006,
            eta: "Delivered"
          };
        } else {
          updates.deliveryPartner = {
            name: "Ramesh Kumar",
            phone: "+91 98765 43210",
            vehicle: "Hero Electric – AP 39 AB 1234",
            lat: 14.6819,
            lng: 77.6006,
            destLat: 14.6819,
            destLng: 77.6006,
            eta: "Delivered"
          };
        }
      } else if (status === 'Cancelled') {
        // COD orders don't need a refund; online-paid orders do
        if (order.paymentMethod !== 'COD' && order.paymentStatus === 'Paid') {
          updates.paymentStatus = 'Refunded';
          if (!updates.refundStatus) updates.refundStatus = 'Pending'; // Needs admin approval
          if (!updates.refundAmount) updates.refundAmount = order.grandTotal;
        } else {
          updates.paymentStatus = order.paymentStatus; // keep as-is for COD
        }
      }
    }

    // Handle payment status update (can be independent of delivery status)
    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
    }

    const updatedOrder = await db.orders.update(orderId, updates);
    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: 'Order not found after update' }, { status: 404 });
    }

    // Trigger WhatsApp & FCM notifications

    if (status) {
      // Send WhatsApp Event (e.g. Order Confirmed, Order Packed, Out For Delivery, Delivered, Order Cancelled)
      let waEvent = status;
      if (status === 'Packed') waEvent = 'Order Packed';
      else if (status === 'Out for Delivery') waEvent = 'Out For Delivery';
      else if (status === 'Cancelled') waEvent = 'Order Cancelled';
      
      triggerWhatsApp(waEvent, updatedOrder).catch((e: unknown) => console.error("WhatsApp status trigger failed:", e));

      if (order) {
        const title = `Order Status: ${status}`;
        let body = `Your order ${orderId} has been updated to ${status}.`;
        if (status === 'Confirmed') {
          body = `Your order ${orderId} has been confirmed and is being packed.`;
        } else if (status === 'Out for Delivery') {
          body = `Our delivery partner is on the way with your order ${orderId}!`;
        } else if (status === 'Delivered') {
          body = `Your order ${orderId} has been delivered successfully. Thank you for choosing us!`;
        }
        sendPushNotification(order.userId, title, body).catch((e: unknown) => console.error("FCM Send failed:", e));
      }
    }

    if (paymentStatus === 'Paid' && (!order || order.paymentStatus !== 'Paid')) {
      triggerWhatsApp('Payment Successful', updatedOrder).catch((e: unknown) => console.error("WhatsApp payment trigger failed:", e));
    }

    // Activity logging
    if (status) {
      if (status === 'Cancelled') {
        logActivity(order.userId, 'cancel_order', { orderId, reason: cancellationReason || 'No reason provided' });

        // Admin notification for cancellation
        try {
          const adminUsers = db.users.getAll().filter(u => u.role === 'admin');
          for (const admin of adminUsers) {
            db.notifications.create({
              id: `NOT-ADM-CANCEL-${Date.now()}-${Math.floor(Math.random() * 999)}`,
              userId: admin.id,
              title: 'Order Cancelled',
              message: `Order ${orderId} was cancelled${cancellationReason ? ': ' + cancellationReason : ''}.`,
              type: 'Order Updates',
              isRead: false,
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) { console.error('[Admin cancel notification]', e); }

      } else if (status === 'Delivered') {
        logActivity(order.userId, 'payment', { orderId, event: 'delivered' });

        // Free up delivery partner if assigned
        if ((order as any).deliveryPartnerId) {
          const partner = db.deliveryPartners.getById((order as any).deliveryPartnerId);
          if (partner) {
            db.deliveryPartners.update(partner.id, {
              currentOrderId: null,
              completedDeliveries: partner.completedDeliveries + 1
            });
          }
        }
      }
    }

    if (refundStatus === 'Completed' && (!order || order.refundStatus !== 'Completed')) {
      triggerWhatsApp('Refund Processed', updatedOrder).catch((e: unknown) => console.error('WhatsApp refund trigger failed:', e));
    }

    // Broadcast SSE event
    sseManager.broadcast('order_updated', updatedOrder);

    return NextResponse.json(
      { success: true, order: updatedOrder },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
