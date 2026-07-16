import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, email, phone, subject, message, priority } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, message: 'name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: userId || null,
        name: String(name).trim(),
        email: String(email).trim(),
        phone: phone ? String(phone).trim() : null,
        subject: String(subject).trim(),
        message: String(message).trim(),
        status: 'Pending',
        priority: priority || 'Normal'
      }
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, adminReply, priority } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (adminReply !== undefined) updates.adminReply = adminReply;
    if (priority) updates.priority = priority;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: updates
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
