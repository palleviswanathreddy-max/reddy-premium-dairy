import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: false, message: 'Coupon code is required' }, { status: 400 });
    }

    const coupon = db.coupons.getByCode(code);
    if (!coupon) {
      return NextResponse.json({ success: false, message: 'Coupon not found or expired' }, { status: 404 });
    }

    return NextResponse.json({ success: true, coupon, message: 'Coupon applied successfully!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
