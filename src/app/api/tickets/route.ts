import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET() {
  try {
    const tickets = db.tickets.getAll();
    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = `TCK-${Math.floor(100 + Math.random() * 900)}`;
    const newTicket = db.tickets.create({
      ...body,
      id,
      status: 'Pending',
      createdAt: new Date().toISOString()
    });
    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
