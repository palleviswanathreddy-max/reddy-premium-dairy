import { NextResponse } from 'next/server';
import { db, IncomingStock } from '@/db/db';

export const dynamic = 'force-dynamic';

// GET — full inventory view
export async function GET() {
  try {
    const products = db.products.getAll();
    const incomingStock = db.incomingStock.getAll();

    const inventory = products.map(p => {
      const incoming = incomingStock
        .filter(s => s.productId === p.id)
        .reduce((sum, s) => sum + s.quantity, 0);

      const orders = db.orders.getAll();
      const sold = orders
        .filter(o => !['Cancelled', 'Returned'].includes(o.status))
        .flatMap(o => o.items)
        .filter(item => item.productId === p.id)
        .reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        currentStock: p.stock,
        status: p.status,
        totalIncoming: incoming,
        totalSold: sold,
        stockValue: p.stock * p.price,
        isLowStock: p.stock > 0 && p.stock <= 15,
        isOutOfStock: p.stock === 0
      };
    });

    // Summary stats
    const totalStockValue = inventory.reduce((sum, p) => sum + p.stockValue, 0);
    const lowStockCount = inventory.filter(p => p.isLowStock).length;
    const outOfStockCount = inventory.filter(p => p.isOutOfStock).length;
    const totalUnits = inventory.reduce((sum, p) => sum + p.currentStock, 0);

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
    const { productId, quantity, batchNumber, expiryDate, notes, addedBy } = body;

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, message: 'productId and a positive quantity are required' },
        { status: 400 }
      );
    }

    const product = db.products.getById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    // Add to incoming stock log
    const entry: IncomingStock = {
      id: `STK-${Date.now()}`,
      productId,
      productName: product.name,
      quantity: Number(quantity),
      batchNumber: batchNumber || undefined,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
      addedBy: addedBy || 'Admin',
      createdAt: new Date().toISOString()
    };
    db.incomingStock.create(entry);

    // Update product stock
    const newStock = product.stock + Number(quantity);
    const newStatus = newStock === 0 ? 'Out of Stock' : newStock <= 10 ? 'Low Stock' : 'Available';
    const updatedProduct = db.products.update(productId, { stock: newStock, status: newStatus });

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

    const product = db.products.getById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const newStatus = stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'Available';
    const updatedProduct = db.products.update(productId, { stock: Number(stock), status: newStatus });

    // Log the adjustment as incoming stock if positive delta
    const delta = Number(stock) - product.stock;
    if (delta !== 0) {
      const entry: IncomingStock = {
        id: `STK-ADJ-${Date.now()}`,
        productId,
        productName: product.name,
        quantity: delta,
        notes: notes || `Manual stock adjustment (delta: ${delta > 0 ? '+' : ''}${delta})`,
        addedBy: 'Admin',
        createdAt: new Date().toISOString()
      };
      db.incomingStock.create(entry);
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
