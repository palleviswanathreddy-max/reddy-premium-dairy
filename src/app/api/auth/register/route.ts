import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function POST(request: Request) {
  try {
    const { name, email, phone, password } = await request.json();
    if (!name || !email || !phone || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // Duplicate check
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: 'insensitive' } },
          { phone: { endsWith: cleanPhone } }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User with this email or mobile number already exists' }, { status: 409 });
    }

    // Hash Password securely
    const hashed = await hashPassword(password);

    // Create user in PostgreSQL via Prisma Client
    const dbUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: hashed,
        role: 'customer',
        walletBalance: 0,
        rewardPoints: 100, // starting loyalty bonus
        lastLoginAt: new Date()
      }
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

    // Admin notification for new registration
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'admin' }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'New Customer Registered',
            message: `${name} (${cleanEmail}) has signed up.`,
            type: 'Admin Messages',
            isRead: false
          }
        });
      }
    } catch (e) {
      console.error('[Admin registration notification failed]', e);
    }

    const response = NextResponse.json({ 
      success: true, 
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

    // Set secure HTTP Only cookie headers
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60, // 15 mins
      path: '/'
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
