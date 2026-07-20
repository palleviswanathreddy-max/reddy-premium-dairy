import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/utils/auth-check';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const dbOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: true,
        deliveryPartner: true
      }
    });

    if (!dbOrder) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Security check: Only allow users to view their own orders unless they are admin
    if (dbOrder.userId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const order = {
      id: dbOrder.id,
      userId: dbOrder.userId,
      userName: dbOrder.user.name,
      userEmail: dbOrder.user.email,
      userPhone: dbOrder.user.phone,
      subtotal: dbOrder.subtotal,
      gstTotal: dbOrder.gstTotal,
      deliveryCharges: dbOrder.deliveryCharges,
      discount: dbOrder.discount,
      grandTotal: dbOrder.grandTotal,
      status: dbOrder.status,
      paymentMethod: dbOrder.paymentMethod,
      paymentStatus: dbOrder.paymentStatus,
      deliverySlot: dbOrder.deliverySlot,
      deliveryAddress: dbOrder.deliveryAddress,
      giftMessage: dbOrder.giftMessage,
      deliveryInstructions: dbOrder.deliveryInstructions,
      deliveryOtp: dbOrder.deliveryOtp,
      expectedDelivery: dbOrder.expectedDelivery?.toISOString() || null,
      deliveredAt: dbOrder.deliveredAt?.toISOString() || null,
      cancellationReason: dbOrder.cancellationReason,
      refundStatus: dbOrder.refundStatus,
      refundAmount: dbOrder.refundAmount,
      subscriptionType: dbOrder.subscriptionType,
      invoiceNumber: dbOrder.invoiceNumber,
      timeline: dbOrder.timeline,
      couponCode: dbOrder.couponCode,
      createdAt: dbOrder.createdAt.toISOString(),
      items: dbOrder.items.map((item: any) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        gst: item.gst
      })),
      deliveryPartner: dbOrder.deliveryPartner ? {
        id: dbOrder.deliveryPartner.id,
        name: dbOrder.deliveryPartner.name,
        phone: dbOrder.deliveryPartner.phone
      } : null
    };

    return NextResponse.json({
      success: true,
      message: 'Order retrieved successfully',
      order,
      data: { order }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
