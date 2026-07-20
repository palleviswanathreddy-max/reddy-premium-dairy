import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmation, triggerWhatsApp } from '@/lib/notifications';
import { sseManager } from '@/utils/events';
import { getAuthenticatedUser } from '@/utils/auth-check';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '100'));
    const statusFilter = searchParams.get('status');
    const paymentFilter = searchParams.get('payment');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const searchId = searchParams.get('q');

    // Build Prisma where clause
    const where: any = {};

    if (authUser.role !== 'admin') {
      where.userId = authUser.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }
    if (paymentFilter && paymentFilter !== 'all') {
      where.OR = [
        { paymentStatus: paymentFilter },
        { paymentMethod: paymentFilter }
      ];
    }
    if (from) {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(from) };
    }
    if (to) {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(to) };
    }
    if (searchId) {
      where.id = { contains: searchId, mode: 'insensitive' };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true } },
          user: true,
          deliveryPartner: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    type DbOrdersListRow = typeof orders[number];
    const mapped = orders.map((o: DbOrdersListRow) => ({
      id: o.id,
      userId: o.userId,
      userName: o.user.name,
      userEmail: o.user.email,
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
      giftMessage: o.giftMessage,
      deliveryInstructions: o.deliveryInstructions,
      deliveryOtp: o.deliveryOtp,
      expectedDelivery: o.expectedDelivery?.toISOString() || null,
      deliveredAt: o.deliveredAt?.toISOString() || null,
      cancellationReason: o.cancellationReason,
      refundStatus: o.refundStatus,
      refundAmount: o.refundAmount,
      subscriptionType: o.subscriptionType,
      invoiceNumber: o.invoiceNumber,
      timeline: o.timeline,
      couponCode: o.couponCode,
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
        phone: o.deliveryPartner.phone
      } : null
    }));

    return NextResponse.json(
      {
        success: true,
        message: 'Orders retrieved successfully',
        orders: mapped,
        data: { orders: mapped, total, page, limit }
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const finalUserId = authUser.id;
    const body = await request.json();

    // ── Input Validation ────────────────────────────────────────────────
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, message: 'Order must contain at least one item' }, { status: 400 });
    }
    if (!body.paymentMethod) {
      return NextResponse.json({ success: false, message: 'paymentMethod is required' }, { status: 400 });
    }
    if (!body.deliveryAddress) {
      return NextResponse.json({ success: false, message: 'deliveryAddress is required' }, { status: 400 });
    }
    if (typeof body.grandTotal !== 'number' || body.grandTotal <= 0) {
      return NextResponse.json({ success: false, message: 'grandTotal must be a positive number' }, { status: 400 });
    }

    // ── Duplicate Order Prevention ───────────────────────────────────────
    if (finalUserId) {
      const sixtySecondsAgo = new Date(Date.now() - 60_000);
      const recentOrders = await prisma.order.findMany({
        where: {
          userId: finalUserId,
          createdAt: { gte: sixtySecondsAgo }
        },
        include: { items: true }
      });

      const sameItemIds = body.items.map((i: { productId: string }) => i.productId).sort().join(',');
      const duplicate = recentOrders.find((o: any) => {
        const existingItemIds = o.items.map((i: any) => i.productId).sort().join(',');
        return existingItemIds === sameItemIds;
      });

      if (duplicate) {
        console.warn(`[Duplicate Order Prevented] userId=${finalUserId} orderId=${duplicate.id}`);
        return NextResponse.json({ success: true, order: duplicate, duplicate: true });
      }
    }

    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create timeline
    const timeline = [
      { status: 'Pending', time: new Date().toISOString(), done: true },
      { status: 'Confirmed', time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), done: true },
      { status: 'Packed', time: '', done: false },
      { status: 'Shipped', time: '', done: false },
      { status: 'Out for Delivery', time: '', done: false },
      { status: 'Delivered', time: '', done: false }
    ];

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${orderId.split('-').pop()}`;

    // Create order and update stock atomically inside a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Lock and check stock of all products
      const productIds = body.items.map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const dbProductMap = new Map<string, any>(dbProducts.map((p) => [p.id, p]));

      for (const item of body.items) {
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
          subtotal: Number(body.subtotal) || 0,
          gstTotal: Number(body.gstTotal) || 0,
          deliveryCharges: Number(body.deliveryCharges) || 0,
          discount: Number(body.discount) || 0,
          grandTotal: Number(body.grandTotal),
          status: 'Pending',
          paymentMethod: body.paymentMethod,
          paymentStatus: body.paymentMethod === 'COD' ? 'Pending' : 'Paid',
          deliverySlot: body.deliverySlot || null,
          deliveryAddress: body.deliveryAddress,
          giftMessage: body.giftMessage || null,
          deliveryInstructions: body.deliveryInstructions || null,
          deliveryOtp,
          subscriptionType: body.subscriptionType || 'One Time Order',
          invoiceNumber,
          timeline,
          couponCode: body.couponCode || null,
          items: {
            create: body.items.map((item: any) => {
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
        include: {
          items: true,
          user: true
        }
      });

      // 3. Update stock levels
      for (const item of body.items) {
        const prod = dbProductMap.get(item.productId)!;
        const nextStock = prod.stock - (Number(item.quantity) || 1);
        const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: nextStock, status: nextStatus }
        });
      }

      // 4. Clear user's cart items from database on success
      if (finalUserId) {
        await tx.cartItem.deleteMany({
          where: { userId: finalUserId }
        });
      }

      return createdOrder;
    });

    // Log activity
    if (finalUserId) {
      await prisma.activityLog.createMany({
        data: [
          { userId: finalUserId, type: 'order_placed', meta: { orderId, grandTotal: body.grandTotal } },
          { userId: finalUserId, type: 'payment', meta: { orderId, method: body.paymentMethod } }
        ]
      });
    }

    // Admin notification for new order
    try {
      const adminUsers = await prisma.user.findMany({ where: { role: 'admin' } });
      if (adminUsers.length > 0) {
        await prisma.notification.createMany({
          data: adminUsers.map((admin: any) => ({
            userId: admin.id,
            title: 'New Order Received',
            message: `Order ${orderId} placed for Rs. ${body.grandTotal?.toFixed(2) || '0.00'} via ${body.paymentMethod}.`,
            type: 'Order Updates',
            isRead: false
          }))
        });
      }
    } catch (adminNotifErr) {
      console.error('[Admin notification failed]', adminNotifErr);
    }

    // Build response object
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
      giftMessage: newOrder.giftMessage,
      deliveryInstructions: newOrder.deliveryInstructions,
      deliveryOtp: newOrder.deliveryOtp,
      subscriptionType: newOrder.subscriptionType,
      invoiceNumber: newOrder.invoiceNumber,
      timeline: newOrder.timeline,
      couponCode: newOrder.couponCode,
      createdAt: newOrder.createdAt.toISOString(),
      items: newOrder.items.map((item: any) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        gst: item.gst
      }))
    };

    // Trigger Notification (fire and forget)
    const userEmail = newOrder.user?.email || undefined;
    sendOrderConfirmation(orderResponse as any, userEmail).catch((e: unknown) => console.error('Notification failed:', e));
    triggerWhatsApp('Order Placed', orderResponse as any).catch((e: unknown) => console.error('WhatsApp placement failed:', e));

    // Broadcast SSE event
    sseManager.broadcast('order_created', orderResponse);

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      order: orderResponse,
      orderId: orderResponse.id,
      data: { order: orderResponse }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
