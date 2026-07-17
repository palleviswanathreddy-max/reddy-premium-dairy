import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Search users by name, email, phone, or ID
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { id: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        addresses: true,
        orders: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      take: 20
    });

    // Also search by order ID
    let extraUsers: typeof users = [];
    if (users.length === 0) {
      const matchedOrders = await prisma.order.findMany({
        where: { id: { contains: q, mode: 'insensitive' } },
        include: {
          user: {
            include: {
              addresses: true,
              orders: {
                include: { items: true },
                orderBy: { createdAt: 'desc' },
                take: 10
              }
            }
          }
        },
        take: 5
      });
      extraUsers = matchedOrders.map(o => o.user);
    }

    const allUsers = [...users, ...extraUsers];

    type DbUser = typeof allUsers[number];
    const results = allUsers.slice(0, 20).map((u: DbUser) => {
      const totalSpending = u.orders
        .filter((o: any) => !['Cancelled'].includes(o.status))
        .reduce((sum: number, o: any) => sum + o.grandTotal, 0);

      const lastOrder = u.orders[0] || null;

      return {
        id: u.id,
        name: u.name,
        email: u.email || '',
        phone: u.phone || '',
        role: u.role,
        avatar: u.avatar,
        addresses: u.addresses,
        walletBalance: u.walletBalance,
        rewardPoints: u.rewardPoints,
        lastLoginAt: u.lastLoginAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        isActive: true,
        totalOrders: u.orders.length,
        totalSpending,
        lastOrder: lastOrder ? {
          id: lastOrder.id,
          status: lastOrder.status,
          grandTotal: lastOrder.grandTotal,
          createdAt: lastOrder.createdAt.toISOString()
        } : null,
        orderHistory: u.orders.slice(0, 10).map((o: any) => ({
          id: o.id,
          status: o.status,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          grandTotal: o.grandTotal,
          items: o.items,
          deliveryAddress: o.deliveryAddress,
          createdAt: o.createdAt.toISOString(),
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
