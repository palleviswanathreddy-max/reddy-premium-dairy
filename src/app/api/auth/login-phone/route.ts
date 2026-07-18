import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function GET() {
  return new Response("Auth is handled by NextAuth session or custom credentials", { status: 404 });
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ success: false, message: 'Phone number is required' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    let dbUser = await prisma.user.findFirst({
      where: { phone: { endsWith: normalizedPhone } }
    });

    if (!dbUser) {
      // Auto-register phone user
      dbUser = await prisma.user.create({
        data: {
          name: `User ${normalizedPhone}`,
          email: `${normalizedPhone}@reddy.com`,
          phone: normalizedPhone,
          role: 'customer',
          passwordHash: 'otp-registered-account',
          rewardPoints: 0,
          walletBalance: 0
        }
      });
    }

    // Generate tokens
    const payload = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      name: dbUser.name
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLoginAt: new Date() }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        type: 'login'
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        phone: dbUser.phone,
        walletBalance: dbUser.walletBalance,
        rewardPoints: dbUser.rewardPoints
      }
    });

    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 // 15 mins
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
