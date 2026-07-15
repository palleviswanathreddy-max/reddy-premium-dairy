import { NextResponse } from 'next/server';
import { retryFailedWhatsAppMessages } from '@/lib/whatsapp';

export async function POST() {
  try {
    await retryFailedWhatsAppMessages();
    return NextResponse.json({ success: true, message: 'Retry process triggered successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
