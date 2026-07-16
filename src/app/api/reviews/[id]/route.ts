import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, adminReply, title, description } = body;

    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (adminReply !== undefined) updates.adminReply = adminReply;
    if (title) updates.title = title;
    if (description) updates.description = description;

    const updated = await prisma.review.update({
      where: { id },
      data: updates,
      include: {
        user: true
      }
    });

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    const created = {
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

    return NextResponse.json({ success: true, review: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Review deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

