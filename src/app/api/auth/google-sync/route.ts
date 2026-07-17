import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { success: false, message: 'No active Google session found' },
        { status: 401 }
      );
    }

    const email = session.user.email.toLowerCase();

    // Query user from PostgreSQL via Prisma Client
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        addresses: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: 'Google account sync failed. User not created.' },
        { status: 404 }
      );
    }

    const userPayload = {
      id: dbUser.id,
      email: dbUser.email || '',
      role: dbUser.role,
      name: dbUser.name,
    };

    // Generate JWT tokens
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Save Refresh Token in PostgreSQL database
    await prisma.refreshToken.deleteMany({ where: { userId: dbUser.id } });
    await prisma.refreshToken.create({
      data: {
        userId: dbUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        type: 'login',
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email || '',
        role: dbUser.role,
        name: dbUser.name,
        phone: dbUser.phone || '',
        walletBalance: dbUser.walletBalance || 0,
        rewardPoints: dbUser.rewardPoints || 0,
        addresses: dbUser.addresses || [],
        avatar: dbUser.avatar || null,
      },
    });

    // Set Secure HTTP-Only Cookie headers
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
