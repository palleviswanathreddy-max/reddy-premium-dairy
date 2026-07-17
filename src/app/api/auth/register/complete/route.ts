import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRegistrationToken, hashPassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function POST(request: Request) {
  try {
    const { registrationToken, name, password } = await request.json();

    if (!registrationToken || !name || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required (name, password, and registration token)' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Verify registration token (proves OTP was verified)
    const tokenData = verifyRegistrationToken(registrationToken);
    if (!tokenData) {
      return NextResponse.json({
        success: false,
        message: 'Registration session expired. Please verify your OTP again.'
      }, { status: 401 });
    }

    const { identifier, identifierType } = tokenData;

    // Duplicate check
    const existingUser = await prisma.user.findFirst({
      where: identifierType === 'email'
        ? { email: { equals: identifier, mode: 'insensitive' } }
        : { phone: { endsWith: identifier } }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'This email or mobile number is already registered. Please log in instead.'
      }, { status: 409 });
    }

    // Create user account
    const hashedPassword = await hashPassword(password);
    const cleanName = name.trim();

    const dbUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: identifierType === 'email' ? identifier : `${identifier}@reddy-mobile.com`,
        phone: identifierType === 'phone' ? identifier : null,
        passwordHash: hashedPassword,
        role: 'customer',
        walletBalance: 0,
        rewardPoints: 100,
        emailVerified: identifierType === 'email',
        mobileVerified: identifierType === 'phone',
        lastLoginAt: new Date()
      }
    });

    const userPayload = {
      id: dbUser.id,
      email: dbUser.email || '',
      role: dbUser.role,
      name: dbUser.name
    };

    // Issue JWT tokens & Auto-login
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
        type: 'register'
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful! Welcome to Reddy Premium Dairy.',
      user: {
        id: dbUser.id,
        email: dbUser.email || '',
        role: dbUser.role,
        name: dbUser.name,
        phone: dbUser.phone || '',
        walletBalance: 0,
        rewardPoints: 100,
        addresses: []
      }
    });

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
