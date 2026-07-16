import { NextResponse } from 'next/server';
import { db, DeliveryPartner } from '@/db/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const partners = db.deliveryPartners.getAll();
    const orders = db.orders.getAll();

    const enriched = partners.map(p => {
      const assignedOrders = orders.filter(
        o => o.deliveryPartner && (o as any).deliveryPartnerId === p.id &&
          !['Delivered', 'Cancelled'].includes(o.status)
      );
      return {
        ...p,
        activeOrders: assignedOrders.length
      };
    });

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

    const partner: DeliveryPartner = {
      id: `DP-${Date.now()}`,
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : undefined,
      vehicle: String(vehicle).trim(),
      vehicleNumber: vehicleNumber ? String(vehicleNumber).trim() : undefined,
      isActive: true,
      currentOrderId: null,
      completedDeliveries: 0,
      rating: 5.0,
      createdAt: new Date().toISOString()
    };

    db.deliveryPartners.create(partner);
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

    const updated = db.deliveryPartners.update(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Partner not found' }, { status: 404 });
    }

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

    const deleted = db.deliveryPartners.delete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
