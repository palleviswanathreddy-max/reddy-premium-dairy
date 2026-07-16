import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/db/auth-helper';

export async function POST(request: Request) {
  try {
    const { identifier, newPassword } = await request.json();

    if (!identifier || !newPassword) {
      return NextResponse.json({ success: false, message: 'Identifier and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Auto-detect email vs phone
    const trimmed = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(trimmed);
    const normalizedIdentifier = isEmail
      ? trimmed.toLowerCase()
      : trimmed.replace(/\D/g, '').slice(-10);

    const hashed = await hashPassword(newPassword);

    // Query user in PostgreSQL
    const dbUser = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: normalizedIdentifier, mode: 'insensitive' } }
        : { phone: { endsWith: normalizedIdentifier } }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: 'User not found. Please register.' }, { status: 404 });
    }

    // Update passwordHash
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: hashed }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        type: 'password_change'
      }
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now login.' });

  } catch (err: any) {
    console.error('Reset Password API Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
