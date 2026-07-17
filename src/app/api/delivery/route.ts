import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          notIn: ['Delivered', 'Cancelled']
        }
      },
      include: {
        items: { include: { product: true } },
        user: true,
        deliveryPartner: true
      },
      orderBy: { createdAt: 'desc' }
    });

    type DbDeliveryOrder = typeof orders[number];
    const mapped = orders.map((o: DbDeliveryOrder) => ({
      id: o.id,
      userId: o.userId,
      userName: o.user.name,
      userPhone: o.user.phone,
      subtotal: o.subtotal,
      gstTotal: o.gstTotal,
      deliveryCharges: o.deliveryCharges,
      discount: o.discount,
      grandTotal: o.grandTotal,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      deliverySlot: o.deliverySlot,
      deliveryAddress: o.deliveryAddress,
      deliveryOtp: o.deliveryOtp,
      expectedDelivery: o.expectedDelivery?.toISOString() || null,
      timeline: o.timeline,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((item: any) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        gst: item.gst
      })),
      deliveryPartner: o.deliveryPartner ? {
        id: o.deliveryPartner.id,
        name: o.deliveryPartner.name,
        phone: o.deliveryPartner.phone,
        vehicle: o.deliveryPartner.vehicle
      } : null
    }));

    return NextResponse.json({ success: true, orders: mapped });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { orderId, action } = await request.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const updates: any = {};

    if (action === 'MARK_DELIVERED') {
      updates.status = 'Delivered';
      updates.paymentStatus = 'Paid';
      updates.deliveredAt = new Date();

      // Update timeline
      const timeline = (order.timeline as any[]) || [];
      updates.timeline = timeline.map((step: any) => ({
        ...step,
        done: true,
        time: step.time || new Date().toISOString()
      }));
    } else if (action === 'MARK_OUT_FOR_DELIVERY') {
      updates.status = 'Out for Delivery';
      updates.expectedDelivery = new Date(Date.now() + 30 * 60 * 1000);

      // Update timeline
      const timeline = (order.timeline as any[]) || [];
      updates.timeline = timeline.map((step: any) => {
        if (step.status === 'Out for Delivery') {
          return { ...step, done: true, time: new Date().toISOString() };
        }
        return step;
      });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updates
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
