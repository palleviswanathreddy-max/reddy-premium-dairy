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

    // Trigger FCM status updates push notifications
    if (status && order) {
      const title = `Order Status: ${status}`;
      let body = `Your order ${orderId} has been updated to ${status}.`;
      if (status === 'Confirmed') {
        body = `Your order ${orderId} has been confirmed and is being packed.`;
      } else if (status === 'Out for Delivery') {
        body = `Our delivery partner is on the way with your order ${orderId}!`;
      } else if (status === 'Delivered') {
        body = `Your order ${orderId} has been delivered successfully. Thank you for choosing us!`;
      }
      
      const { sendPushNotification } = require('@/lib/notifications');
      sendPushNotification(order.userId, title, body).catch((e: any) => console.error("FCM Send failed:", e));
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
