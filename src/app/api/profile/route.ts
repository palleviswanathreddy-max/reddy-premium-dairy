import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = db.users.getById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ success: false, message: 'User not found or deleted' }, { status: 404 });
    }

    // Omit sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, passwordHash, ...safeUser } = user;
    
    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, gender, dob, bloodGroup, emergencyContact } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user = db.users.getById(userId);
    if (!user || user.deletedAt) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const updatedUser = db.users.update(userId, { name, gender, dob, bloodGroup, emergencyContact });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, passwordHash, ...safeUser } = updatedUser!;

    return NextResponse.json({ success: true, user: safeUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
