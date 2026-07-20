import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    let isSecure = !!(process.env.NEXTAUTH_URL?.startsWith('https://') || 
                      request.headers.get('x-forwarded-proto') === 'https' ||
                      (request.url && request.url.startsWith('https://')));
                   
    if (cookieHeader.includes('__Secure-next-auth.session-token')) {
      isSecure = true;
    } else if (cookieHeader.includes('next-auth.session-token')) {
      isSecure = false;
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'reddy-premium-dairy-nextauth-secret-key-2026',
      secureCookie: isSecure
    });

    if (!token || !token.email) {
      return NextResponse.json(
        { success: false, message: 'No active Google session found' },
        { status: 401 }
      );
    }

    const email = token.email.toLowerCase();

    // Query user from PostgreSQL via Prisma Client
    const dbUser = await prisma.user.findUnique({
      where: { email },
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

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        type: 'login',
      },
    });

    // Generate tokens for custom JWT compatibility
    const payload = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      name: dbUser.name
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

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
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
