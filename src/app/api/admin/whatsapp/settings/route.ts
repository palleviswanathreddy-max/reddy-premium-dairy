import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { connectMongo, MongooseAppSettings } from '@/db/mongodb';

export async function GET() {
  try {
    const settings = db.settings.get();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { whatsappNotificationsEnabled } = await request.json();
    if (typeof whatsappNotificationsEnabled !== 'boolean') {
      return NextResponse.json({ success: false, message: 'whatsappNotificationsEnabled parameter must be boolean' }, { status: 400 });
    }

    // 1. Update local JSON DB
    const settings = db.settings.update({ whatsappNotificationsEnabled });

    // 2. Update MongoDB settings
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        await MongooseAppSettings.findOneAndUpdate(
          {},
          { whatsappNotificationsEnabled },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn('[MongoDB Settings Update Error]', err);
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
