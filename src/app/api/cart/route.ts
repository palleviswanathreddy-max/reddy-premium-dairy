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

    const dbCartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    type DbCartItemRow = typeof dbCartItems[number];
    const cart = dbCartItems.map((item: DbCartItemRow) => {
      const { category, categoryId: _categoryId, ...safeProduct } = item.product;
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: {
          ...safeProduct,
          category: category?.name || 'Other'
        }
      };
    });

    return NextResponse.json({ success: true, cart });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, cart } = body;

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

    // Clean old cart items
    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    // Save new cart items
    if (cart && cart.length > 0) {
      await prisma.cartItem.createMany({
        data: cart.map((item: any) => ({
          userId,
          productId: item.productId,
          quantity: Number(item.quantity) || 1
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
