import { NextResponse } from 'next/server';
import { db, Review } from '@/db/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    let reviews = db.reviews.getAll();

    if (productId) {
      reviews = reviews.filter(r => r.productId === productId);
    }

    if (status) {
      reviews = reviews.filter(r => r.status === status);
    }

    // Filter out deleted
    reviews = reviews.filter(r => !r.deletedAt);

    return NextResponse.json({ success: true, reviews });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, userId, userName, rating, title, description, images = [], videos = [] } = body;

    if (!productId || !userId || !rating || !title || !description) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const user = db.users.getById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Check if user bought this product (Verified Purchase logic)
    const userOrders = db.orders.getAll().filter(o => o.userId === userId && o.status === 'Delivered');
    let isVerifiedPurchase = false;
    for (const order of userOrders) {
      if (order.items.some(item => item.productId === productId)) {
        isVerifiedPurchase = true;
        break;
      }
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productId,
      userId,
      userName: user.name,
      userAvatar: user.avatar ?? undefined,
      rating,
      title,
      description,
      images,
      videos,
      isVerifiedPurchase,
      status: 'pending', // Requires admin approval based on PRD
      helpfulCount: 0,
      likeCount: 0,
      helpfulVotes: [],
      likes: [],
      reports: [],
      createdAt: new Date().toISOString()
    };

    const created = db.reviews.create(newReview);
    return NextResponse.json({ success: true, review: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
