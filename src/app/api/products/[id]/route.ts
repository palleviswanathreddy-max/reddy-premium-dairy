import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedOrFetch, CacheKeys, cache } from '@/utils/cache';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbProd = await getCachedOrFetch(CacheKeys.PRODUCT(id), async () => {
      return prisma.product.findUnique({
        where: { id },
        include: {
          category: true
        }
      });
    });

    if (!dbProd) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const { category, categoryId: _categoryId, ...safeProduct } = dbProd;
    const product = {
      ...safeProduct,
      category: category?.name || 'Other'
    };

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = { ...body };
    delete updateData.category;
    delete updateData.id;

    if (body.category) {
      const catName = body.category;
      let cat = await prisma.category.findUnique({ where: { name: catName } });
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            name: catName,
            slug: catName.toLowerCase().replace(/\s+/g, '-')
          }
        });
      }
      updateData.categoryId = cat.id;
    }

    if (body.mrp !== undefined) updateData.mrp = Number(body.mrp);
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.discount !== undefined) updateData.discount = Number(body.discount);
    if (body.gst !== undefined) updateData.gst = Number(body.gst);
    if (body.stock !== undefined) updateData.stock = Number(body.stock);
    if (body.expiryDays !== undefined) updateData.expiryDays = Number(body.expiryDays);
    if (body.rating !== undefined) updateData.rating = Number(body.rating);

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const { category, categoryId: _categoryId, ...safeProduct } = updated;
    // Invalidate product caches
    cache.delete(CacheKeys.PRODUCT(id));
    cache.invalidatePattern('products:');
    return NextResponse.json({
      success: true,
      product: {
        ...safeProduct,
        category: category?.name || 'Other'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({
      where: { id }
    });

    // Invalidate product caches
    cache.delete(CacheKeys.PRODUCT(id));
    cache.invalidatePattern('products:');

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
