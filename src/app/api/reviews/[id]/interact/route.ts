import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, actionType, reason } = body; 
    // actionType: 'like' | 'helpful' | 'report'

    if (!userId || !actionType) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    let updates: any = {};

    const reviewLikes = (review.likes as string[]) || [];
    const reviewHelpfulVotes = (review.helpfulVotes as string[]) || [];
    const reviewReports = (review.reports as any[]) || [];

    if (actionType === 'like') {
      const hasLiked = reviewLikes.includes(userId);
      const newLikes = hasLiked 
        ? reviewLikes.filter((u: any) => u !== userId) 
        : [...reviewLikes, userId];
      updates = { likes: newLikes, likeCount: newLikes.length };
    } 
    else if (actionType === 'helpful') {
      const hasVoted = reviewHelpfulVotes.includes(userId);
      const newVotes = hasVoted 
        ? reviewHelpfulVotes.filter((u: any) => u !== userId) 
        : [...reviewHelpfulVotes, userId];
      updates = { helpfulVotes: newVotes, helpfulCount: newVotes.length };
    }
    else if (actionType === 'report') {
      if (!reason) return NextResponse.json({ success: false, message: 'Reason required for report' }, { status: 400 });
      const hasReported = reviewReports.some((r: any) => r.userId === userId);
      if (hasReported) {
        return NextResponse.json({ success: false, message: 'You already reported this review' }, { status: 400 });
      }
      updates = { reports: [...reviewReports, { userId, reason }] };
    }
    else {
      return NextResponse.json({ success: false, message: 'Invalid actionType' }, { status: 400 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: updates,
      include: {
        user: true
      }
    });

    const result = {
      id: updated.id,
      productId: updated.productId,
      userId: updated.userId,
      userName: updated.user.name,
      userAvatar: updated.user.avatar,
      rating: updated.rating,
      title: updated.title,
      description: updated.description,
      images: updated.images,
      videos: updated.videos,
      isVerifiedPurchase: updated.isVerifiedPurchase,
      status: updated.status,
      helpfulCount: updated.helpfulCount,
      likeCount: updated.likeCount,
      helpfulVotes: updated.helpfulVotes,
      likes: updated.likes,
      reports: updated.reports,
      createdAt: updated.createdAt.toISOString()
    };

    return NextResponse.json({ success: true, review: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
