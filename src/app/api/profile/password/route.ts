import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const user = db.users.getById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Since we mock passwords initially (e.g. "password"), we check both plain and hashed
    const isValidOld = user.passwordHash 
      ? await bcrypt.compare(currentPassword, user.passwordHash)
      : user.password === currentPassword;

    if (!isValidOld) {
      return NextResponse.json({ success: false, message: 'Incorrect current password' }, { status: 401 });
    }

    // Validate new password (8 chars, 1 upper, 1 lower, 1 num, 1 special)
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passRegex.test(newPassword)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Password must be at least 8 characters, include uppercase, lowercase, number and special character.' 
      }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.users.update(userId, { passwordHash, password: newPassword }); // keep mock password field synced for existing mock logic if any

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
