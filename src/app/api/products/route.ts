import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET() {
  try {
    const products = db.products.getAll();
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = `prod-${Date.now()}`;
    const newProduct = db.products.create({
      ...body,
      id,
      rating: body.rating || 5.0,
      reviews: body.reviews || [],
      frequentlyBoughtTogether: body.frequentlyBoughtTogether || [],
      relatedProducts: body.relatedProducts || []
    });
    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
