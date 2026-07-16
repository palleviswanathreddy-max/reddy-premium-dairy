import { NextResponse } from 'next/server';
import { db, logActivity } from '@/db/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, partnerId } = body;

    if (!orderId || !partnerId) {
      return NextResponse.json(
        { success: false, message: 'orderId and partnerId are required' },
        { status: 400 }
      );
    }

    const order = db.orders.getById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const partner = db.deliveryPartners.getById(partnerId);
    if (!partner) {
      return NextResponse.json({ success: false, message: 'Delivery partner not found' }, { status: 404 });
    }

    if (!partner.isActive) {
      return NextResponse.json({ success: false, message: 'Delivery partner is inactive' }, { status: 400 });
    }

    // Update order with partner details + set status to Out for Delivery if not already further along
    const partnerEmbed = {
      name: partner.name,
      phone: partner.phone,
      vehicle: `${partner.vehicle}${partner.vehicleNumber ? ` – ${partner.vehicleNumber}` : ''}`,
      eta: '30 mins'
    };

    const orderUpdates: Record<string, unknown> = {
      deliveryPartner: partnerEmbed,
      deliveryPartnerId: partnerId
    };

    const statusOrder = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentIdx = statusOrder.indexOf(order.status);
    if (currentIdx < statusOrder.indexOf('Out for Delivery')) {
      orderUpdates.status = 'Out for Delivery';
      orderUpdates.expectedDelivery = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // Update timeline
      const updatedTimeline = order.timeline.map(step => {
        const stepIdx = statusOrder.indexOf(step.status);
        const targetIdx = statusOrder.indexOf('Out for Delivery');
        if (stepIdx <= targetIdx && !step.done) {
          return { ...step, done: true, time: new Date().toISOString() };
        }
        return step;
      });
      orderUpdates.timeline = updatedTimeline;
    }

    const updatedOrder = db.orders.update(orderId, orderUpdates as Parameters<typeof db.orders.update>[1]);
    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
    }

    // Mark partner as busy
    db.deliveryPartners.update(partnerId, { currentOrderId: orderId });

    // Log activity
    logActivity(order.userId, 'order_placed', { orderId, event: 'partner_assigned', partnerId });

    return NextResponse.json({ success: true, order: updatedOrder, partner });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
