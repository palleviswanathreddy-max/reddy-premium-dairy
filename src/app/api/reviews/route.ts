import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    const dbReviews = await prisma.review.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(status ? { status } : {})
      },
      include: {
        user: true
      }
    });


    const reviews = dbReviews.map(r => ({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      userName: r.user.name,
      userAvatar: r.user.avatar,
      rating: r.rating,
      title: r.title,
      description: r.description,
      images: r.images,
      videos: r.videos,
      isVerifiedPurchase: r.isVerifiedPurchase,
      status: r.status,
      helpfulCount: r.helpfulCount,
      likeCount: r.likeCount,
      helpfulVotes: r.helpfulVotes,
      likes: r.likes,
      reports: r.reports,
      createdAt: r.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, reviews });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, userId, rating, title, description, images = [], videos = [] } = body;

    if (!productId || !userId || !rating || !title || !description) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Check if user bought this product (Verified Purchase logic)
    const userOrders = await prisma.order.findMany({
      where: {
        userId,
        status: 'Delivered',
        items: {
          some: {
            productId
          }
        }
      }
    });

    const isVerifiedPurchase = userOrders.length > 0;

    const newReview = await prisma.review.create({
      data: {
        productId,
        userId,
        userName: user.name,
        userAvatar: user.avatar || null,
        rating: Number(rating),
        title,
        description,
        images: images || [],
        videos: videos || [],
        isVerifiedPurchase,
        status: 'pending',
        helpfulCount: 0,
        likeCount: 0,
        helpfulVotes: [],
        likes: [],
        reports: []
      },
      include: {
        user: true
      }
    });


    const created = {
      id: newReview.id,
      productId: newReview.productId,
      userId: newReview.userId,
      userName: newReview.user.name,
      userAvatar: newReview.user.avatar,
      rating: newReview.rating,
      title: newReview.title,
      description: newReview.description,
      images: newReview.images,
      videos: newReview.videos,
      isVerifiedPurchase: newReview.isVerifiedPurchase,
      status: newReview.status,
      helpfulCount: newReview.helpfulCount,
      likeCount: newReview.likeCount,
      helpfulVotes: newReview.helpfulVotes,
      likes: newReview.likes,
      reports: newReview.reports,
      createdAt: newReview.createdAt.toISOString()
    };

    return NextResponse.json({ success: true, review: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
