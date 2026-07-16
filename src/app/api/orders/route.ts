import { NextResponse } from 'next/server';
import { db, logActivity } from '@/db/db';
import { sendOrderConfirmation, triggerWhatsApp } from '@/lib/notifications';
import { sseManager } from '@/utils/events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '100'));
    const statusFilter = searchParams.get('status'); // optional filter
    const paymentFilter = searchParams.get('payment');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const searchId = searchParams.get('q');

    let orders = db.orders.getAll();

    // Role-based filtering
    if (role !== 'admin') {
      if (userId) {
        orders = orders.filter(o => o.userId === userId);
      } else {
        orders = [];
      }
    }

    // Optional filters
    if (statusFilter && statusFilter !== 'all') {
      orders = orders.filter(o => o.status === statusFilter);
    }
    if (paymentFilter && paymentFilter !== 'all') {
      orders = orders.filter(o => o.paymentStatus === paymentFilter || o.paymentMethod === paymentFilter);
    }
    if (from) {
      const fromDate = new Date(from);
      orders = orders.filter(o => new Date(o.createdAt) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      orders = orders.filter(o => new Date(o.createdAt) <= toDate);
    }
    if (searchId) {
      orders = orders.filter(o => o.id.toLowerCase().includes(searchId.toLowerCase()));
    }

    const total = orders.length;
    const paginated = orders.slice((page - 1) * limit, page * limit);

    return NextResponse.json(
      { success: true, orders: paginated, total, page, limit },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    // Prevent placing the same order twice within 60 seconds
    if (body.userId && body.userId !== 'user-guest') {
      const recentOrders = db.orders.getByUserId(body.userId);
      const sixtySecondsAgo = Date.now() - 60_000;
      const sameItemIds = body.items.map((i: { productId: string }) => i.productId).sort().join(',');

      const duplicate = recentOrders.find(o => {
        if (new Date(o.createdAt).getTime() < sixtySecondsAgo) return false;
        const existingItemIds = o.items.map(i => i.productId).sort().join(',');
        return existingItemIds === sameItemIds;
      });

      if (duplicate) {
        console.warn(`[Duplicate Order Prevented] userId=${body.userId} orderId=${duplicate.id}`);
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

    const newOrder = await db.orders.create({
      ...body,
      id: orderId,
      status: 'Pending',
      paymentStatus: body.paymentMethod === 'COD' ? 'Pending' : 'Paid',
      createdAt: new Date().toISOString(),
      timeline,
      deliveryOtp,
      invoiceNumber
    });

    // Update Product Stock Levels
    for (const item of body.items) {
      const prod = db.products.getById(item.productId);
      if (prod) {
        const nextStock = Math.max(0, prod.stock - item.quantity);
        const nextStatus = nextStock === 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'Available';
        db.products.update(item.productId, { stock: nextStock, status: nextStatus });
      }
    }

    // Log activity
    if (body.userId && body.userId !== 'user-guest') {
      logActivity(body.userId, 'order_placed', { orderId, grandTotal: body.grandTotal });
      logActivity(body.userId, 'payment', { orderId, method: body.paymentMethod });
    }

    // Admin notification for new order
    try {
      const adminUsers = db.users.getAll().filter(u => u.role === 'admin');
      for (const admin of adminUsers) {
        db.notifications.create({
          id: `NOT-ADM-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          userId: admin.id,
          title: 'New Order Received',
          message: `Order ${orderId} placed for Rs. ${body.grandTotal?.toFixed(2) || '0.00'} via ${body.paymentMethod}.`,
          type: 'Order Updates',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (adminNotifErr) {
      console.error('[Admin notification failed]', adminNotifErr);
    }

    // Trigger Notification (fire and forget)
    let userEmail: string | undefined;
    if (body.userId) {
      const user = db.users.getById(body.userId);
      if (user) userEmail = user.email;
    }
    
    sendOrderConfirmation(newOrder, userEmail).catch((e: unknown) => console.error('Notification failed:', e));
    triggerWhatsApp('Order Placed', newOrder).catch((e: unknown) => console.error('WhatsApp placement failed:', e));

    // Broadcast SSE event
    sseManager.broadcast('order_created', newOrder);

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
