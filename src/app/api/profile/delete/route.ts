import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, otp } = body; // Using mock OTP for now

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (otp !== '1234') { // Hardcoded OTP for mock
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });
    }

    const user = db.users.getById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Soft delete
    db.users.update(userId, { deletedAt: new Date().toISOString() });

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
