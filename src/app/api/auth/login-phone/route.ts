import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ success: false, message: 'Phone number is required' }, { status: 400 });
    }

    // Normalize phone number to last 10 digits
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    if (normalizedPhone.length !== 10) {
      return NextResponse.json({ success: false, message: 'Invalid phone number format' }, { status: 400 });
    }

    // Find or auto-register in PostgreSQL
    let dbUser = await prisma.user.findFirst({
      where: { phone: { endsWith: normalizedPhone } },
      include: {
        addresses: true
      }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          name: `User ${normalizedPhone}`,
          email: `${normalizedPhone}@reddy.com`,
          phone: normalizedPhone,
          role: 'customer',
          passwordHash: 'otp-registered-account',
          rewardPoints: 0,
          walletBalance: 0
        },
        include: {
          addresses: true
        }
      });
    } else {
      // Update lastLoginAt
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() }
      });
    }

    const userPayload = {
      id: dbUser.id,
      email: dbUser.email || '',
      role: dbUser.role,
      name: dbUser.name
    };

    // Generate JWT tokens
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Save Refresh Token in PostgreSQL database
    // Delete any existing tokens for this user first to avoid unique constraint violations.
    await prisma.refreshToken.deleteMany({ where: { userId: dbUser.id } });
    await prisma.refreshToken.create({
      data: {
        userId: dbUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
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
      user: {
        id: dbUser.id,
        email: dbUser.email || '',
        role: dbUser.role,
        name: dbUser.name,
        phone: dbUser.phone || '',
        walletBalance: dbUser.walletBalance || 0,
        rewardPoints: dbUser.rewardPoints || 0,
        addresses: dbUser.addresses || [],
        avatar: dbUser.avatar || null
      }
    });

    // Set Secure HTTP-Only Cookie headers
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60,
      path: '/'
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
