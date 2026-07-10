import { NextResponse } from 'next/server';
import { connectMongo, MongooseOTP, MongooseUser } from '@/db/mongodb';
import { sendRealSMS } from '@/db/auth-helper';
import { sendEmailOTP } from '@/db/email-helper';
import { getDb, saveDb } from '@/db/db';
import { cache } from '@/utils/cache';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function detectIdentifierType(identifier: string): 'email' | 'phone' | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = identifier.replace(/\D/g, '');
  if (emailRegex.test(identifier)) return 'email';
  if (phoneDigits.length === 10) return 'phone';
  return null;
}

/** Returns true if the OTP request is allowed, false if rate-limited. */
function checkOtpRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
  const key = `otp_rate:${identifier}`;
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxAttempts = 3;

  const record = cache.get<{ count: number; firstAt: number }>(key);

  if (!record) {
    cache.set(key, { count: 1, firstAt: Date.now() }, windowMs);
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    const elapsed = Date.now() - record.firstAt;
    const waitSeconds = Math.ceil((windowMs - elapsed) / 1000);
    return { allowed: false, waitSeconds: Math.max(0, waitSeconds) };
  }

  cache.set(key, { count: record.count + 1, firstAt: record.firstAt }, windowMs);
  return { allowed: true };
}

// ──────────────────────────────────────────────
// Production vs. Demo mode determination
// Demo mode is ONLY allowed when NODE_ENV !== 'production'
// ──────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please enter your email or mobile number' },
        { status: 400 }
      );
    }

    const trimmed = identifier.trim();
    const identifierType = detectIdentifierType(trimmed);

    if (!identifierType) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address or 10-digit mobile number' },
        { status: 400 }
      );
    }

    // Normalize
    const normalizedIdentifier =
      identifierType === 'phone'
        ? trimmed.replace(/\D/g, '').slice(-10)
        : trimmed.toLowerCase();

    // ──────────────────────────────────────────────
    // RATE LIMIT: max 3 OTP requests per identifier per 10 minutes
    // ──────────────────────────────────────────────
    const rateCheck = checkOtpRateLimit(normalizedIdentifier);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many OTP requests. Please wait ${rateCheck.waitSeconds} seconds before trying again.`
        },
        { status: 429 }
      );
    }

    // ──────────────────────────────────────────────
    // DUPLICATE CHECK: Is this email/mobile already registered?
    // ──────────────────────────────────────────────
    let alreadyRegistered = false;

    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const query =
          identifierType === 'email'
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
      return NextResponse.json(
        {
          success: false,
          message: 'This email or mobile number is already registered. Please log in instead.',
          alreadyRegistered: true
        },
        { status: 409 }
      );
    }

    // ──────────────────────────────────────────────
    // SERVICE AVAILABILITY CHECK
    // ──────────────────────────────────────────────
    const emailConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const smsConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
    const serviceConfigured = identifierType === 'email' ? emailConfigured : smsConfigured;

    // In production, NEVER fall back to demo mode — show a proper error instead
    if (IS_PRODUCTION && !serviceConfigured) {
      console.error(
        `[OTP] Production OTP service not configured for type="${identifierType}". ` +
          `Please set the required environment variables in Vercel dashboard.`
      );
      return NextResponse.json(
        {
          success: false,
          message:
            'OTP service is temporarily unavailable. Please try again later or contact support.'
        },
        { status: 503 }
      );
    }

    // ──────────────────────────────────────────────
    // GENERATE & SAVE OTP
    // ──────────────────────────────────────────────
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    let dbSaved = false;

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
    // DEMO MODE — development only, never production
    // ──────────────────────────────────────────────
    if (!IS_PRODUCTION && !serviceConfigured) {
      return NextResponse.json({
        success: true,
        identifierType,
        demoOtp: otpCode,
        isDemoMode: true,
        message: `Demo mode: Your verification code is ${otpCode} (valid 5 min)`
      });
    }

    // ──────────────────────────────────────────────
    // SEND OTP via real email or SMS
    // ──────────────────────────────────────────────
    if (identifierType === 'email') {
      try {
        const result = await sendEmailOTP(normalizedIdentifier, otpCode);
        if (!result.success) {
          console.error('[OTP Email Send Error]', result.error);
          return NextResponse.json(
            { success: false, message: 'Failed to send verification email. Please try again.' },
            { status: 502 }
          );
        }
      } catch (err) {
        console.error('[OTP Email Exception]', err);
        return NextResponse.json(
          { success: false, message: 'Failed to send verification email. Please try again.' },
          { status: 502 }
        );
      }
    } else {
      try {
        const smsMessage = `Your REDDY PREMIUM DAIRY verification code is ${otpCode}. Valid for 5 minutes. Do not share this code.`;
        const result = await sendRealSMS(normalizedIdentifier, smsMessage);
        if (!result.success) {
          console.error('[OTP SMS Send Error]', result.error);
          return NextResponse.json(
            { success: false, message: 'Failed to send SMS. Please try again.' },
            { status: 502 }
          );
        }
      } catch (err) {
        console.error('[OTP SMS Exception]', err);
        return NextResponse.json(
          { success: false, message: 'Failed to send SMS. Please try again.' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      identifierType,
      message:
        identifierType === 'email'
          ? 'Verification code sent to your email address'
          : 'Verification code sent to your mobile number'
    });
  } catch (err: any) {
    console.error('[OTP Send Route Error]', err);
    return NextResponse.json({ success: false, message: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
