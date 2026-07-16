import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { connectMongo } from '@/db/mongodb';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (process.env.MONGODB_URI) {
      try {
        const connection = await connectMongo();
        const mongoDb = connection.connection.db;
        await mongoDb.collection('tickets').updateOne({ id }, { $set: body });
      } catch (mongoErr) {
        console.warn('MongoDB ticket update failed, using localdb fallback:', mongoErr);
      }
    }
    
    const updated = db.tickets.update(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (process.env.MONGODB_URI) {
      try {
        const connection = await connectMongo();
        const mongoDb = connection.connection.db;
        await mongoDb.collection('tickets').deleteOne({ id });
      } catch (mongoErr) {
        console.warn('MongoDB ticket delete failed, using localdb fallback:', mongoErr);
      }
    }
    
    const deleted = db.tickets.delete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
