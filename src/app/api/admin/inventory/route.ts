import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — full inventory view
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        inventoryLogs: true,
        orderItems: {
          include: {
            order: { select: { status: true } }
          }
        }
      }
    });

    type DbInventoryProduct = typeof products[number];
    const inventory = products.map((p: DbInventoryProduct) => {
      const incoming = p.inventoryLogs
        .filter((l: typeof p.inventoryLogs[number]) => l.quantity > 0)
        .reduce((sum: number, l: typeof p.inventoryLogs[number]) => sum + l.quantity, 0);

      const sold = p.orderItems
        .filter((item: typeof p.orderItems[number]) => !['Cancelled', 'Returned'].includes(item.order.status))
        .reduce((sum: number, item: typeof p.orderItems[number]) => sum + item.quantity, 0);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name || 'Other',
        currentStock: p.stock,
        status: p.status,
        totalIncoming: incoming,
        totalSold: sold,
        stockValue: p.stock * p.price,
        isLowStock: p.stock > 0 && p.stock <= 15,
        isOutOfStock: p.stock === 0
      };
    });

    const totalStockValue = inventory.reduce((sum: number, p: any) => sum + p.stockValue, 0);
    const lowStockCount = inventory.filter((p: any) => p.isLowStock).length;
    const outOfStockCount = inventory.filter((p: any) => p.isOutOfStock).length;
    const totalUnits = inventory.reduce((sum: number, p: any) => sum + p.currentStock, 0);

    return NextResponse.json({
      success: true,
      inventory,
      summary: { totalStockValue, lowStockCount, outOfStockCount, totalUnits, totalSKUs: products.length }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// POST — add incoming stock batch
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity, notes, addedBy } = body;

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, message: 'productId and a positive quantity are required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const newStock = product.stock + Number(quantity);
    const newStatus = newStock === 0 ? 'Out of Stock' : newStock <= 10 ? 'Low Stock' : 'Available';

    const [entry, updatedProduct] = await prisma.$transaction([
      prisma.inventoryLog.create({
        data: {
          productId,
          quantity: Number(quantity),
          notes: notes || undefined,
          addedBy: addedBy || 'Admin'
        }
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock, status: newStatus }
      })
    ]);

    return NextResponse.json({ success: true, entry, product: updatedProduct });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

// PUT — direct stock adjustment (admin override)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productId, stock, notes } = body;

    if (!productId || stock === undefined || stock < 0) {
      return NextResponse.json(
        { success: false, message: 'productId and non-negative stock are required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const newStatus = stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'Available';
    const delta = Number(stock) - product.stock;

    const ops: any[] = [
      prisma.product.update({
        where: { id: productId },
        data: { stock: Number(stock), status: newStatus }
      })
    ];

    if (delta !== 0) {
      ops.push(
        prisma.inventoryLog.create({
          data: {
            productId,
            quantity: delta,
            notes: notes || `Manual stock adjustment (delta: ${delta > 0 ? '+' : ''}${delta})`,
            addedBy: 'Admin'
          }
        })
      );
    }

    const [updatedProduct] = await prisma.$transaction(ops);

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
