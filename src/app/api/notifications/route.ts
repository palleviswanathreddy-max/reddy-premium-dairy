import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/utils/auth-check';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || authUser.id;

    // Security check: Only allow users to fetch their own notifications unless they are admin
    if (userId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    type DbNotificationRow = typeof notifications[number];
    return NextResponse.json({
      success: true,
      notifications: notifications.map((n: DbNotificationRow) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString()
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, userId } = body;

    const targetUserId = userId || authUser.id;

    // Security check
    if (targetUserId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (userId) {
      // Mark all as read for user
      await prisma.notification.updateMany({
        where: { userId: targetUserId },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });
    }

    // Verify ownership of the notification
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId }
    });
    if (existing && existing.userId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const notificationId = searchParams.get('id');

    if (notificationId) {
      // Verify ownership
      const existing = await prisma.notification.findUnique({
        where: { id: notificationId }
      });
      if (existing && existing.userId !== authUser.id && authUser.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
      await prisma.notification.delete({ where: { id: notificationId } });
    } else if (userId) {
      if (userId !== authUser.id && authUser.role !== 'admin') {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
      await prisma.notification.deleteMany({ where: { userId } });
    } else {
      return NextResponse.json({ success: false, message: 'userId or id required' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Notifications cleared' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, message, type } = body;

    const targetUserId = userId || authUser.id;

    if (targetUserId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: title || 'Notification',
        message: message || '',
        type: type || 'Order Updates',
        isRead: false
      }
    });

    return NextResponse.json({ success: true, notification });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
