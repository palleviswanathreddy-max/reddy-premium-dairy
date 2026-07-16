import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId, ...updates } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    // Update user in PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: 'User account not found' }, { status: 404 });
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: updatedUser.id,
        type: 'profile_update'
      }
    });

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({ success: true, user: userWithoutPassword });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
