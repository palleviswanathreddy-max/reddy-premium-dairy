import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Helper: upsert guest user without race conditions
async function ensureUser(userId: string) {
  if (userId === 'user-guest') {
    return prisma.user.upsert({
      where: { id: 'user-guest' },
      update: {},
      create: {
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
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'UserId required' }, { status: 400 });
    }

    const user = await ensureUser(userId);

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
    // cart can be either CartItem[] (with .product) or {productId, quantity}[]
    const { userId, cart } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'UserId required' }, { status: 400 });
    }

    const user = await ensureUser(userId);

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Normalise cart items — accept both formats
    // Format A: { productId, quantity }  (from API-direct callers)
    // Format B: { product: { id }, quantity }  (from AppContext CartItem[])
    const normalised: { productId: string; quantity: number }[] = (cart || []).map((item: any) => ({
      productId: item.productId || item.product?.id,
      quantity: Number(item.quantity) || 1
    })).filter((item: any) => !!item.productId);

    // Clean old cart items
    await prisma.cartItem.deleteMany({ where: { userId } });

    // Save new cart items
    if (normalised.length > 0) {
      await prisma.cartItem.createMany({
        data: normalised.map(item => ({
          userId,
          productId: item.productId,
          quantity: item.quantity
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
