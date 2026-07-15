import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // Return specific coupon
    if (code) {
      const coupon = db.coupons.getByCode(code);
      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ success: false, message: 'Coupon not found or inactive' }, { status: 404 });
      }
      
      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        return NextResponse.json({ success: false, message: 'Coupon has expired' }, { status: 400 });
      }

      return NextResponse.json({ success: true, coupon, message: 'Coupon applied successfully!' });
    }

    // Return all coupons
    const coupons = db.coupons.getAll();
    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const existing = db.coupons.getByCode(data.code);
    if (existing) {
      return NextResponse.json({ success: false, message: 'Coupon code already exists' }, { status: 400 });
    }

    const coupon = db.coupons.create({
      id: `cpn_${Date.now()}`,
      ...data,
      isActive: true
    });

    return NextResponse.json({ success: true, coupon });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.code) {
      return NextResponse.json({ success: false, message: 'Code is required' }, { status: 400 });
    }
    const updated = db.coupons.update(data.code, data);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Coupon not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, coupon: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ success: false, message: 'Code is required' }, { status: 400 });
    }
    db.coupons.delete(code);
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
