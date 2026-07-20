import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedOrFetch, CacheKeys, cache } from '@/utils/cache';

export async function GET() {
  try {
    const products = await getCachedOrFetch(CacheKeys.PRODUCTS(), async () => {
      const dbProducts = await prisma.product.findMany({
        select: {
          id: true,
          sku: true,
          name: true,
          brand: true,
          description: true,
          ingredients: true,
          storage: true,
          nutrition: true,
          weight: true,
          volume: true,
          mrp: true,
          price: true,
          discount: true,
          gst: true,
          stock: true,
          status: true,
          expiryDays: true,
          deliveryTime: true,
          rating: true,
          images: true,
          tags: true,
          frequentlyBoughtTogether: true,
          relatedProducts: true,
          variants: true,
          faq: true,
          createdAt: true,
          category: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        }
      });

      return dbProducts.map((p) => {
        const { category, _count, ...rest } = p;
        return {
          ...rest,
          category: category?.name || 'Other',
          reviewCount: _count?.reviews ?? 0
        };
      });
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
    // Use upsert to avoid distinct findUnique and create queries
    const cat = await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: {
        name: catName,
        slug: catName.toLowerCase().replace(/\s+/g, '-')
      }
    });

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
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        description: true,
        ingredients: true,
        storage: true,
        nutrition: true,
        weight: true,
        volume: true,
        mrp: true,
        price: true,
        discount: true,
        gst: true,
        stock: true,
        status: true,
        expiryDays: true,
        deliveryTime: true,
        rating: true,
        images: true,
        tags: true,
        frequentlyBoughtTogether: true,
        relatedProducts: true,
        variants: true,
        faq: true,
        createdAt: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    const { category, ...safeProduct } = newProduct;
    // Invalidate products cache
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
