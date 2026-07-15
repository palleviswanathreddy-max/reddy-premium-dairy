import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { connectMongo, MongooseWhatsAppLog } from '@/db/mongodb';

export async function GET() {
  try {
    let logs: any[] = [];

    // 1. Fetch from MongoDB if available
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const mLogs = await MongooseWhatsAppLog.find({}).sort({ createdAt: -1 });
        logs = mLogs.map(l => ({
          id: l._id.toString(),
          orderId: l.orderId,
          recipient: l.recipient,
          event: l.event,
          message: l.message,
          status: l.status,
          attempts: l.attempts,
          error: l.error,
          createdAt: l.createdAt.toISOString()
        }));
      } catch (err) {
        console.warn('[MongoDB Logs Query Error] Falling back to local DB logs:', err);
      }
    }

    // 2. Fetch from local JSON DB if MongoDB failed or is empty
    if (logs.length === 0) {
      logs = db.whatsappLogs.getAll().map((l: any) => ({
        id: l.id,
        orderId: l.orderId,
        recipient: l.recipient,
        event: l.event,
        message: l.message,
        status: l.status,
        attempts: l.attempts,
        error: l.error,
        createdAt: l.createdAt
      }));
    }

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
