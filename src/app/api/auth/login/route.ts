import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();
    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/Mobile and password are required' }, { status: 400 });
    }

    // Auto-detect: is identifier an email or a 10-digit phone?
    const trimmed = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(trimmed);
    const normalizedIdentifier = isEmail
      ? trimmed.toLowerCase()
      : trimmed.replace(/\D/g, '').slice(-10);

    if (!isEmail && normalizedIdentifier.length !== 10) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address or 10-digit mobile number' }, { status: 400 });
    }

    // Query user from PostgreSQL via Prisma Client
    const dbUser = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: normalizedIdentifier, mode: 'insensitive' } }
        : { phone: { endsWith: normalizedIdentifier } },
      include: {
        addresses: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({
        success: false,
        message: 'No account found with this email/mobile number. Please register first.'
      }, { status: 404 });
    }

    // Check password matches (seeded or hashed)
    const passwordHash = dbUser.passwordHash || '';
    const isMatch = await comparePassword(password, passwordHash);

    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLoginAt: new Date() }
    });

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
    // Delete any existing tokens for this user first to avoid unique constraint
    // violations when the same user logs in multiple times rapidly.
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
