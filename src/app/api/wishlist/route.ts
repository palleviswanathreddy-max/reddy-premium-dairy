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

    const userId = authUser.id;

    const dbWishlistItems = await prisma.wishlistItem.findMany({
      where: { userId }
    });

    const wishlist = dbWishlistItems.map((item: any) => item.productId);

    return NextResponse.json({ success: true, wishlist });
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
    const { wishlist } = body; // Array of product IDs
    const userId = authUser.id;

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
