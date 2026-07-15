import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'UserId required' }, { status: 400 });
    }

    let user = db.users.getById(userId);
    if (!user && userId === 'user-guest') {
      user = db.users.create({
        id: 'user-guest',
        email: 'guest@reddypremiumdairy.com',
        name: 'Guest User',
        role: 'customer',
        phone: '',
        avatar: null,
        addresses: [],
        rewardPoints: 0,
        walletBalance: 0,
      });
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Return custom fields wishlist stored on user object in database
    return NextResponse.json({ success: true, wishlist: (user as any).wishlist || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, wishlist } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'UserId required' }, { status: 400 });
    }

    let user = db.users.getById(userId);
    if (!user && userId === 'user-guest') {
      user = db.users.create({
        id: 'user-guest',
        email: 'guest@reddypremiumdairy.com',
        name: 'Guest User',
        role: 'customer',
        phone: '',
        avatar: null,
        addresses: [],
        rewardPoints: 0,
        walletBalance: 0,
      });
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    db.users.update(userId, { wishlist } as any);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
