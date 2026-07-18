import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/db/auth-helper';

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

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        type: 'register'
      }
    });

    // Admin notification for new registration in a single database operation
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'admin' }
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin: any) => ({
            userId: admin.id,
            title: 'New Customer Registered',
            message: `${name} (${cleanEmail}) has signed up.`,
            type: 'Admin Messages',
            isRead: false
          }))
        });
      }
    } catch (e) {
      console.error('[Admin registration notification failed]', e);
    }

    return NextResponse.json({ 
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

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
