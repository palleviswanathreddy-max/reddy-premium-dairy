import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const dbProducts = await prisma.product.findMany({
      include: {
        category: true,
        _count: { select: { reviews: true } }
      }
    });

    type DbProduct = typeof dbProducts[number];
    const products = dbProducts.map((p: DbProduct) => {
      const { category, categoryId: _categoryId, _count, ...rest } = p;
      return {
        ...rest,
        category: category?.name || 'Other',
        reviewCount: _count?.reviews ?? 0
      };
    });

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = `prod-${Date.now()}`;
    const productData = {
      ...body,
      id,
      rating: body.rating || 5.0,
      frequentlyBoughtTogether: body.frequentlyBoughtTogether || [],
      relatedProducts: body.relatedProducts || []
    };

    const catName = body.category || 'Other';
    let cat = await prisma.category.findUnique({ where: { name: catName } });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: catName,
          slug: catName.toLowerCase().replace(/\s+/g, '-')
        }
      });
    }

    const newProduct = await prisma.product.create({
      data: {
        id: productData.id,
        sku: productData.sku || `SKU-${Date.now()}`,
        name: productData.name,
        categoryId: cat.id,
        brand: productData.brand || 'Reddy Dairy',
        description: productData.description || '',
        ingredients: productData.ingredients || '',
        storage: productData.storage || '',
        nutrition: productData.nutrition || {},
        weight: productData.weight || '',
        volume: productData.volume || '',
        mrp: Number(productData.mrp) || 0,
        price: Number(productData.price) || 0,
        discount: Number(productData.discount) || 0,
        gst: Number(productData.gst) || 0,
        stock: Number(productData.stock) || 0,
        status: productData.status || 'active',
        expiryDays: Number(productData.expiryDays) || 7,
        deliveryTime: productData.deliveryTime || 'morning',
        rating: Number(productData.rating) || 5.0,
        images: productData.images || [],
        tags: productData.tags || [],
        frequentlyBoughtTogether: productData.frequentlyBoughtTogether || [],
        relatedProducts: productData.relatedProducts || [],
        variants: productData.variants || [],
        faq: productData.faq || []
      },
      include: {
        category: true
      }
    });

    const { category, categoryId: _categoryId, ...safeProduct } = newProduct;
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
