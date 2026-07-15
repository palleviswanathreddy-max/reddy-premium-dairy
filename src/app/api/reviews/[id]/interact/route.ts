import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, actionType, reason } = body; 
    // actionType: 'like' | 'helpful' | 'report'

    if (!userId || !actionType) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const review = db.reviews.getById(id);
    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    let updates: any = {};

    if (actionType === 'like') {
      const hasLiked = review.likes.includes(userId);
      const newLikes = hasLiked 
        ? review.likes.filter(u => u !== userId) 
        : [...review.likes, userId];
      updates = { likes: newLikes, likeCount: newLikes.length };
    } 
    else if (actionType === 'helpful') {
      const hasVoted = review.helpfulVotes.includes(userId);
      const newVotes = hasVoted 
        ? review.helpfulVotes.filter(u => u !== userId) 
        : [...review.helpfulVotes, userId];
      updates = { helpfulVotes: newVotes, helpfulCount: newVotes.length };
    }
    else if (actionType === 'report') {
      if (!reason) return NextResponse.json({ success: false, message: 'Reason required for report' }, { status: 400 });
      const hasReported = review.reports.some(r => r.userId === userId);
      if (hasReported) {
        return NextResponse.json({ success: false, message: 'You already reported this review' }, { status: 400 });
      }
      updates = { reports: [...review.reports, { userId, reason }] };
    }
    else {
      return NextResponse.json({ success: false, message: 'Invalid actionType' }, { status: 400 });
    }

    const updated = db.reviews.update(id, updates);
    return NextResponse.json({ success: true, review: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
