import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, base64Image } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = db.users.getById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // In a real app, upload base64Image to Cloudinary/S3 and get URL.
    // For local dev, we just save the base64 string to the DB.
    const updatedUser = db.users.update(userId, { avatar: base64Image });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, passwordHash, ...safeUser } = updatedUser!;

    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
