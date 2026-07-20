import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function GET() {
  return new Response("Auth is handled by NextAuth session or custom credentials", { status: 404 });
}

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();
    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Identifier and password are required' }, { status: 400 });
    }

    const trimmed = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(trimmed);
    const normalizedIdentifier = isEmail
      ? trimmed.toLowerCase()
      : trimmed.replace(/\D/g, '').slice(-10);

    const dbUser = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: normalizedIdentifier, mode: 'insensitive' } }
        : { phone: { endsWith: normalizedIdentifier } }
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: 'No account found with this email/mobile number.' }, { status: 404 });
    }

    if (!dbUser.passwordHash || dbUser.passwordHash === 'otp-registered-account') {
      return NextResponse.json({ success: false, message: 'No password has been set for this account. Please log in using OTP or set a password via Forgot Password.' }, { status: 400 });
    }

    const isMatch = await comparePassword(password, dbUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
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

    // Set lastLoginAt
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

    // Set cookies
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
