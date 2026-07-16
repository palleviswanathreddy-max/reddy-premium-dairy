import { NextResponse } from 'next/server';
import { db, logActivity } from '@/db/db';
import { connectMongo } from '@/db/mongodb';

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

    let order: any = null;
    let partner: any = null;

    if (process.env.MONGODB_URI) {
      try {
        const connection = await connectMongo();
        const mongoDb = connection.connection.db;
        const dbOrder = await mongoDb.collection('orders').findOne({ id: orderId });
        if (dbOrder) {
          const { _id, ...rest } = dbOrder;
          order = { id: dbOrder.id, ...rest };
        }
        const dbPartner = await mongoDb.collection('deliveryPartners').findOne({ id: partnerId });
        if (dbPartner) {
          const { _id, ...rest } = dbPartner;
          partner = { id: dbPartner.id, ...rest };
        }
      } catch (mongoErr) {
        console.warn('MongoDB partner assign fetch failed, using localdb fallback:', mongoErr);
      }
    }

    if (!order) {
      order = db.orders.getById(orderId);
    }
    if (!partner) {
      partner = db.deliveryPartners.getById(partnerId);
    }

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }
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
      const updatedTimeline = order.timeline.map((step: any) => {
        const stepIdx = statusOrder.indexOf(step.status);
        const targetIdx = statusOrder.indexOf('Out for Delivery');
        if (stepIdx <= targetIdx && !step.done) {
          return { ...step, done: true, time: new Date().toISOString() };
        }
        return step;
      });
      orderUpdates.timeline = updatedTimeline;
    }

    if (process.env.MONGODB_URI) {
      try {
        const connection = await connectMongo();
        const mongoDb = connection.connection.db;
        await mongoDb.collection('orders').updateOne({ id: orderId }, { $set: orderUpdates });
        await mongoDb.collection('deliveryPartners').updateOne({ id: partnerId }, { $set: { currentOrderId: orderId } });
      } catch (mongoErr) {
        console.warn('MongoDB partner assignment updates failed, using localdb fallback:', mongoErr);
      }
    }

    const updatedOrder = db.orders.update(orderId, orderUpdates as any);
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
