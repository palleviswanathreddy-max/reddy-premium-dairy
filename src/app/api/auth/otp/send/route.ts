import { NextResponse } from 'next/server';
import { connectMongo, MongooseOTP, MongooseUser } from '@/db/mongodb';
import { sendRealSMS } from '@/db/auth-helper';
import { sendEmailOTP } from '@/db/email-helper';
import { getDb, saveDb } from '@/db/db';

// Detect whether identifier is an email or a 10-digit phone number
function detectIdentifierType(identifier: string): 'email' | 'phone' | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = identifier.replace(/\D/g, '');
  if (emailRegex.test(identifier)) return 'email';
  if (phoneDigits.length === 10) return 'phone';
  return null;
}

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier || !identifier.trim()) {
      return NextResponse.json({ success: false, message: 'Please enter your email or mobile number' }, { status: 400 });
    }

    const trimmed = identifier.trim();
    const identifierType = detectIdentifierType(trimmed);

    if (!identifierType) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address or 10-digit mobile number' }, { status: 400 });
    }

    // Normalize
    const normalizedIdentifier = identifierType === 'phone'
      ? trimmed.replace(/\D/g, '').slice(-10)
      : trimmed.toLowerCase();

    // ──────────────────────────────────────────────
    // DUPLICATE CHECK: Is this email/mobile already registered?
    // ──────────────────────────────────────────────
    let alreadyRegistered = false;

    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const query = identifierType === 'email'
          ? { email: normalizedIdentifier }
          : { phone: normalizedIdentifier };
        const existing = await MongooseUser.findOne(query);
        if (existing) alreadyRegistered = true;
      } catch (err) {
        console.warn('[MongoDB Duplicate Check Error] Falling back to LocalDB:', err);
      }
    }

    if (!alreadyRegistered) {
      const localData = getDb();
      const existing = localData.users.find(u => {
        if (identifierType === 'email') {
          return u.email.toLowerCase() === normalizedIdentifier;
        } else {
          return u.phone.replace(/\D/g, '').slice(-10) === normalizedIdentifier;
        }
      });
      if (existing) alreadyRegistered = true;
    }

    if (alreadyRegistered) {
      return NextResponse.json({
        success: false,
        message: 'This email or mobile number is already registered. Please log in instead.',
        alreadyRegistered: true
      }, { status: 409 });
    }

    // ──────────────────────────────────────────────
    // CHECK SERVICE AVAILABILITY (Demo mode if not configured)
    // ──────────────────────────────────────────────
    const emailConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    const isDemoMode = identifierType === 'email' ? !emailConfigured : !smsConfigured;

    // ──────────────────────────────────────────────
    // GENERATE OTP & SAVE
    // ──────────────────────────────────────────────
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    let dbSaved = false;

    // Save to MongoDB Atlas
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        await MongooseOTP.deleteMany({ identifier: normalizedIdentifier });
        const otpRecord = new MongooseOTP({
          identifier: normalizedIdentifier,
          identifierType,
          purpose: 'registration',
          otpCode,
          expiresAt
        });
        await otpRecord.save();
        dbSaved = true;
      } catch (err) {
        console.warn('[MongoDB OTP Save Error] Falling back to LocalDB:', err);
      }
    }

    // Fallback to Local JSON DB
    if (!dbSaved) {
      const localData = getDb();
      (localData as any).tempOtps = ((localData as any).tempOtps || []).filter(
        (o: any) => o.identifier !== normalizedIdentifier
      );
      (localData as any).tempOtps.push({
        identifier: normalizedIdentifier,
        identifierType,
        purpose: 'registration',
        otpCode,
        expiresAt: expiresAt.toISOString()
      });
      saveDb(localData);
    }

    // ──────────────────────────────────────────────
    // SEND OTP via email or SMS (or demo mode)
    // ──────────────────────────────────────────────
    if (isDemoMode) {
      // Demo mode: return OTP directly in response (no email/SMS needed)
      return NextResponse.json({
        success: true,
        identifierType,
        demoOtp: otpCode,
        isDemoMode: true,
        message: `Demo mode: Your verification code is ${otpCode} (valid 5 min)`
      });
    }

    if (identifierType === 'email') {
      const result = await sendEmailOTP(normalizedIdentifier, otpCode);
      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: `Failed to send verification email: ${result.error}`
        }, { status: 502 });
      }
    } else {
      const smsMessage = `Your REDDY PREMIUM DAIRY verification code is ${otpCode}. Valid for 5 minutes. Do not share this code.`;
      const result = await sendRealSMS(normalizedIdentifier, smsMessage);
      if (!result.success) {
        return NextResponse.json({
          success: false,
          message: `Failed to send SMS: ${result.error}. Please check Twilio credentials.`
        }, { status: 502 });
      }
    }

    return NextResponse.json({
      success: true,
      identifierType,
      message: identifierType === 'email'
        ? 'Verification code sent to your email address'
        : 'Verification code sent to your mobile number'
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
