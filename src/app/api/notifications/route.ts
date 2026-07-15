import { NextResponse } from 'next/server';
import { db } from '@/db/db';

// GET all notifications for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const notifications = db.notifications.getByUserId(userId);
    return NextResponse.json({ success: true, notifications });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PUT mark notification as read
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

    const updated = db.notifications.update(notificationId, { isRead: true });
    return NextResponse.json({ success: true, notification: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE clear all notifications for a user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    db.notifications.deleteByUserId(userId);
    return NextResponse.json({ success: true, message: 'Notifications cleared' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
