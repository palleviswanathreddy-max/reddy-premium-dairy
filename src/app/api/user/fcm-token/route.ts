import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fcmRegistry } from '@/utils/fcm-registry';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, token } = body;

    if (!userId || !token) {
      return NextResponse.json({ success: false, message: 'UserId and Token are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Store in global in-memory registry
    fcmRegistry.set(userId, token);

    // Also attempt storing in DB silently if field exists
    try {
      await (prisma.user as any).update({
        where: { id: userId },
        data: { fcmToken: token }
      });
    } catch {
      // Ignored if field is missing in schema
    }

    return NextResponse.json({ success: true, message: 'FCM token registered successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
