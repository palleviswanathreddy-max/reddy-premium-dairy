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
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cart } = body;
    const userId = authUser.id;

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
