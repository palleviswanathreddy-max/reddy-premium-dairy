import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      notifications: notifications.map(n => ({
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
    const body = await request.json();
    const { notificationId, userId } = body;

    if (userId) {
      // Mark all as read for user
      await prisma.notification.updateMany({
        where: { userId },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    if (!notificationId) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const notificationId = searchParams.get('id');

    if (notificationId) {
      await prisma.notification.delete({ where: { id: notificationId } });
    } else if (userId) {
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
    const body = await request.json();
    const { userId, title, message, type } = body;

    if (!userId) return NextResponse.json({ success: false, message: 'UserId required' }, { status: 400 });

    const notification = await prisma.notification.create({
      data: {
        userId,
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
