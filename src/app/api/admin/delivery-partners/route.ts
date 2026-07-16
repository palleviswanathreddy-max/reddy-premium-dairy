import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const partners = await prisma.deliveryPartner.findMany({
      include: {
        orders: {
          where: {
            status: { notIn: ['Delivered', 'Cancelled'] }
          },
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = partners.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      vehicle: p.vehicle,
      vehicleNumber: p.vehicleNumber,
      isActive: p.isActive,
      currentOrderId: p.currentOrderId,
      completedDeliveries: p.completedDeliveries,
      rating: p.rating,
      createdAt: p.createdAt.toISOString(),
      activeOrders: p.orders.length
    }));

    return NextResponse.json({ success: true, partners: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, vehicle, vehicleNumber } = body;

    if (!name || !phone || !vehicle) {
      return NextResponse.json(
        { success: false, message: 'name, phone, and vehicle are required' },
        { status: 400 }
      );
    }

    const partner = await prisma.deliveryPartner.create({
      data: {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        vehicle: String(vehicle).trim(),
        vehicleNumber: vehicleNumber ? String(vehicleNumber).trim() : null,
        isActive: true,
        completedDeliveries: 0,
        rating: 5.0
      }
    });

    return NextResponse.json({ success: true, partner }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 });
    }

    // Strip non-schema keys
    delete updates.activeOrders;
    delete updates.createdAt;

    const updated = await prisma.deliveryPartner.update({
      where: { id },
      data: updates
    });

    return NextResponse.json({ success: true, partner: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 });
    }

    await prisma.deliveryPartner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
