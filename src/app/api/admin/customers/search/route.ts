import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const users = db.users.getAll();
    const orders = db.orders.getAll();

    // Match users by name, phone, email, or ID
    const matchedUsers = users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q) ||
      // Also search by order ID — find orders first then get users
      orders.some(o => o.userId === u.id && o.id.toLowerCase().includes(q))
    );

    // If no user match but query looks like an order ID, return the order's user
    if (matchedUsers.length === 0) {
      const matchedOrder = orders.find(o => o.id.toLowerCase().includes(q));
      if (matchedOrder) {
        const orderUser = users.find(u => u.id === matchedOrder.userId);
        if (orderUser) matchedUsers.push(orderUser);
      }
    }

    const results = matchedUsers.slice(0, 20).map(u => {
      const userOrders = orders
        .filter(o => o.userId === u.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const totalSpending = userOrders
        .filter(o => !['Cancelled'].includes(o.status))
        .reduce((sum, o) => sum + o.grandTotal, 0);

      const lastOrder = userOrders[0] || null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        avatar: u.avatar,
        addresses: u.addresses,
        walletBalance: u.walletBalance,
        rewardPoints: u.rewardPoints,
        lastLoginAt: (u as any).lastLoginAt || null,
        createdAt: (u as any).createdAt || null,
        isActive: !(u as any).deletedAt,
        totalOrders: userOrders.length,
        totalSpending,
        lastOrder: lastOrder ? {
          id: lastOrder.id,
          status: lastOrder.status,
          grandTotal: lastOrder.grandTotal,
          createdAt: lastOrder.createdAt
        } : null,
        orderHistory: userOrders.slice(0, 10).map(o => ({
          id: o.id,
          status: o.status,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          grandTotal: o.grandTotal,
          items: o.items,
          deliveryAddress: o.deliveryAddress,
          createdAt: o.createdAt,
          timeline: o.timeline
        }))
      };
    });

    return NextResponse.json({
      success: true,
      results,
      total: results.length
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
