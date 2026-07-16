import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'UserId required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Auto-create guest user if requested
    if (!user && userId === 'user-guest') {
      user = await prisma.user.create({
        data: {
          id: 'user-guest',
          email: 'guest@reddypremiumdairy.com',
          name: 'Guest User',
          role: 'customer',
          phone: null,
          walletBalance: 0,
          rewardPoints: 0
        }
      });
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const dbWishlistItems = await prisma.wishlistItem.findMany({
      where: { userId }
    });

    const wishlist = dbWishlistItems.map(item => item.productId);

    return NextResponse.json({ success: true, wishlist });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, wishlist } = body; // Array of product IDs

    if (!userId) {
      return NextResponse.json({ success: false, message: 'UserId required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Auto-create guest user if requested
    if (!user && userId === 'user-guest') {
      user = await prisma.user.create({
        data: {
          id: 'user-guest',
          email: 'guest@reddypremiumdairy.com',
          name: 'Guest User',
          role: 'customer',
          phone: null,
          walletBalance: 0,
          rewardPoints: 0
        }
      });
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Clean old wishlist items
    await prisma.wishlistItem.deleteMany({
      where: { userId }
    });

    // Save new wishlist items
    if (wishlist && wishlist.length > 0) {
      await prisma.wishlistItem.createMany({
        data: wishlist.map((prodId: string) => ({
          userId,
          productId: prodId
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
