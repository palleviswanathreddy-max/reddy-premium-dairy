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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
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
    const rawCart = (cart || []) as Array<{
      productId?: string;
      product?: { id?: string };
      quantity?: number | string;
    }>;

    const normalised: { productId: string; quantity: number }[] = rawCart
      .map((item) => ({
        productId: item.productId || item.product?.id || '',
        quantity: Number(item.quantity) || 1
      }))
      .filter((item) => !!item.productId);

    if (normalised.length === 0) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`;
        await tx.cartItem.deleteMany({ where: { userId } });
      });
      return NextResponse.json({ success: true });
    }

    // Validate productId exists in database before inserting
    const uniqueProductIds = Array.from(new Set(normalised.map(item => item.productId)));
    const existingProducts = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds }
      },
      select: {
        id: true
      }
    });
    const validProductIds = new Set(existingProducts.map(p => p.id));

    // Map-based grouping for matching productIds
    const grouped = new Map<string, number>();
    for (const item of normalised) {
      if (validProductIds.has(item.productId)) {
        const currentQty = grouped.get(item.productId) || 0;
        grouped.set(item.productId, currentQty + item.quantity);
      }
    }

    const groupedList = Array.from(grouped.entries()).map(([productId, quantity]) => ({
      userId,
      productId,
      quantity
    }));

    // Prevent race condition during cart sync via transaction with row lock
    await prisma.$transaction(async (tx) => {
      // Row lock for the current user to prevent concurrent race conditions
      await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`;

      // Clean old cart items
      await tx.cartItem.deleteMany({ where: { userId } });

      // Save new cart items
      if (groupedList.length > 0) {
        await tx.cartItem.createMany({
          data: groupedList,
          skipDuplicates: true
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
