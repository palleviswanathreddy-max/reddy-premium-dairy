import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'customer' },
      include: {
        addresses: true,
        orders: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    type DbCustomer = typeof users[number];
    const customers = users.map((u: DbCustomer) => ({
      id: u.id,
      name: u.name,
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      addresses: u.addresses.length,
      totalOrders: u.orders.length,
      walletBalance: u.walletBalance,
      rewardPoints: u.rewardPoints,
      isVerified: u.emailVerified || u.mobileVerified,
      createdAt: u.createdAt.toISOString(),
      status: 'Active'
    }));

    return NextResponse.json({
      success: true,
      customers,
      total: customers.length
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
