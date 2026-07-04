import { NextResponse } from 'next/server';
import { connectMongo, MongooseOTP } from '@/db/mongodb';
import { sendEmailOTP } from '@/db/email-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email address' }, { status: 400 });
    }

    // Check SMTP config
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({
        success: false,
        message: 'Email service not configured. Set SMTP_USER and SMTP_PASS in your .env.local file.'
      }, { status: 503 });
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let dbSaved = false;

    // Save to MongoDB if available
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        await MongooseOTP.deleteMany({ phone: `email:${email}` });
        const otpRecord = new MongooseOTP({ phone: `email:${email}`, otpCode, expiresAt });
        await otpRecord.save();
        dbSaved = true;
      } catch (err) {
        console.warn('[MongoDB Email OTP Error] Falling back to LocalDB:', err);
      }
    }

    // Fallback to LocalDB
    if (!dbSaved) {
      const localData = getDb();
      (localData as any).tempOtps = ((localData as any).tempOtps || []).filter((o: any) => o.phone !== `email:${email}`);
      (localData as any).tempOtps.push({ phone: `email:${email}`, otpCode, expiresAt: expiresAt.toISOString() });
      saveDb(localData);
    }

    // Send real email
    const result = await sendEmailOTP(email, otpCode);
    if (!result.success) {
      return NextResponse.json({ success: false, message: `Failed to send email: ${result.error}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Verification code sent to your email address' });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
