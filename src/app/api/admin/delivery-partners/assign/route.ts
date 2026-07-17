import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sseManager } from '@/utils/events';

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

    const [order, partner] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, user: true }
      }),
      prisma.deliveryPartner.findUnique({ where: { id: partnerId } })
    ]);

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }
    if (!partner) {
      return NextResponse.json({ success: false, message: 'Delivery partner not found' }, { status: 404 });
    }
    if (!partner.isActive) {
      return NextResponse.json({ success: false, message: 'Delivery partner is inactive' }, { status: 400 });
    }

    // Determine new status
    const statusOrder = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentIdx = statusOrder.indexOf(order.status);
    const updates: any = { deliveryPartnerId: partnerId };

    if (currentIdx < statusOrder.indexOf('Out for Delivery')) {
      updates.status = 'Out for Delivery';
      updates.expectedDelivery = new Date(Date.now() + 30 * 60 * 1000);

      // Update timeline
      const timeline = (order.timeline as any[]) || [];
      updates.timeline = timeline.map((step: any) => {
        const stepIdx = statusOrder.indexOf(step.status);
        const targetIdx = statusOrder.indexOf('Out for Delivery');
        if (stepIdx <= targetIdx && !step.done) {
          return { ...step, done: true, time: new Date().toISOString() };
        }
        return step;
      });
    }

    // Update order and delivery partner in a transaction
    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: updates,
        include: { items: true, user: true, deliveryPartner: true }
      }),
      prisma.deliveryPartner.update({
        where: { id: partnerId },
        data: { currentOrderId: orderId }
      })
    ]);

    // Log activity
    prisma.activityLog.create({
      data: {
        userId: order.userId,
        type: 'order_placed',
        meta: { orderId, event: 'partner_assigned', partnerId }
      }
    }).catch(e => console.error('[activityLog partner_assigned]', e));

    // Broadcast SSE event
    sseManager.broadcast('order_updated', { orderId, status: updates.status || order.status });

    return NextResponse.json({ success: true, order: updatedOrder, partner });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
