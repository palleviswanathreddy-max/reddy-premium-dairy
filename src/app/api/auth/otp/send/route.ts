import { NextResponse } from 'next/server';
import { connectMongo, MongooseOTP } from '@/db/mongodb';
import { sendRealSMS } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    
    // Normalize phone (remove non-digits, keep last 10 digits)
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    if (cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, message: 'Invalid 10-digit mobile number' }, { status: 400 });
    }

    // Strictly enforce Twilio configuration variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return NextResponse.json({ 
        success: false, 
        message: 'SMS Gateway not configured. Please define TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env.local file to enable real OTP delivery.' 
      }, { status: 503 });
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    let dbSaved = false;

    // 1. Save to MongoDB Atlas
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        await MongooseOTP.deleteMany({ phone: cleanPhone });
        const otpRecord = new MongooseOTP({ phone: cleanPhone, otpCode, expiresAt });
        await otpRecord.save();
        dbSaved = true;
      } catch (err) {
        console.warn('[MongoDB OTP Error] Failed to write OTP, falling back to LocalDB:', err);
      }
    }

    // 2. Fallback to Local JSON DB if MongoDB not connected
    if (!dbSaved) {
      const localData = getDb();
      (localData as any).tempOtps = ((localData as any).tempOtps || []).filter((o: any) => o.phone !== cleanPhone);
      (localData as any).tempOtps.push({ phone: cleanPhone, otpCode, expiresAt: expiresAt.toISOString() });
      saveDb(localData);
    }

    // Send real SMS via Twilio
    const smsMessage = `Your REDDY PREMIUM DAIRY security verification code is ${otpCode}. Valid for 5 minutes.`;
    const smsResult = await sendRealSMS(cleanPhone, smsMessage);

    if (!smsResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: `Failed to deliver SMS via Twilio: ${smsResult.error}. Please check your Twilio credentials in .env.local.` 
      }, { status: 502 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OTP verification code sent successfully to your mobile device'
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
