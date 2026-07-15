import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, adminReply, title, description } = body;

    const review = db.reviews.getById(id);
    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    const updates: any = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (adminReply !== undefined) updates.adminReply = adminReply;
    if (title) updates.title = title;
    if (description) updates.description = description;

    const updated = db.reviews.update(id, updates);
    return NextResponse.json({ success: true, review: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const review = db.reviews.getById(id);
    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    db.reviews.update(id, { deletedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, message: 'Review deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
