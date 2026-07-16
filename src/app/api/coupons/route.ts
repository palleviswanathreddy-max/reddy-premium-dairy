import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // Return specific coupon
    if (code) {
      const coupon = await prisma.coupon.findUnique({
        where: { code }
      });

      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ success: false, message: 'Coupon not found or inactive' }, { status: 404 });
      }
      
      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        return NextResponse.json({ success: false, message: 'Coupon has expired' }, { status: 400 });
      }

      return NextResponse.json({ success: true, coupon, message: 'Coupon applied successfully!' });
    }

    // Return all coupons
    const coupons = await prisma.coupon.findMany();
    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Check duplication
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code }
    });

    if (existing) {
      return NextResponse.json({ success: false, message: 'Coupon code already exists' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description || '',
        type: data.type || 'flat',
        value: Number(data.value) || 0,
        minPurchase: Number(data.minPurchase) || 0,
        maxDiscount: Number(data.maxDiscount) || 0,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        isActive: data.isActive !== false
      }
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

    const updateData: any = { ...data };
    delete updateData.code;
    delete updateData.id;

    if (data.value !== undefined) updateData.value = Number(data.value);
    if (data.minPurchase !== undefined) updateData.minPurchase = Number(data.minPurchase);
    if (data.maxDiscount !== undefined) updateData.maxDiscount = Number(data.maxDiscount);
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;

    const updated = await prisma.coupon.update({
      where: { code: data.code },
      data: updateData
    });

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

    await prisma.coupon.delete({
      where: { code }
    });

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
