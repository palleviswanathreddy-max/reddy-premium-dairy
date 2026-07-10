import { NextResponse } from 'next/server';
import { connectMongo, MongooseOTP } from '@/db/mongodb';
import { generateRegistrationToken } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { identifier, otpCode } = await request.json();

    if (!identifier || !otpCode) {
      return NextResponse.json({ success: false, message: 'Identifier and OTP code are required' }, { status: 400 });
    }

    // Normalize identifier
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(identifier.trim());
    const normalizedIdentifier = isEmail
      ? identifier.trim().toLowerCase()
      : identifier.replace(/\D/g, '').slice(-10);
    const identifierType: 'email' | 'phone' = isEmail ? 'email' : 'phone';

    if (!isEmail && normalizedIdentifier.length !== 10) {
      return NextResponse.json({ success: false, message: 'Invalid identifier' }, { status: 400 });
    }

    let isValid = false;

    // 1. Verify against MongoDB Atlas
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const record = await MongooseOTP.findOne({ identifier: normalizedIdentifier }).sort({ _id: -1 });
        if (record && record.otpCode === otpCode && new Date() < record.expiresAt) {
          isValid = true;
          // Delete OTP after successful verification
          await MongooseOTP.deleteMany({ identifier: normalizedIdentifier });
        }
      } catch (err) {
        console.warn('[MongoDB OTP Verification Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Verify against Local JSON DB
    if (!isValid) {
      const localData = getDb();
      const tempOtps = (localData as any).tempOtps || [];
      const match = tempOtps.find(
        (o: any) => o.identifier === normalizedIdentifier && o.otpCode === otpCode && new Date() < new Date(o.expiresAt)
      );
      if (match) {
        isValid = true;
        // Clean up used OTP
        (localData as any).tempOtps = tempOtps.filter((o: any) => o.identifier !== normalizedIdentifier);
        saveDb(localData);
      }
    }

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid or expired OTP. Please try again.' }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // OTP Verified! Issue a short-lived registration token
    // This proves OTP was verified — used in the next step to set password
    // ──────────────────────────────────────────────
    const registrationToken = generateRegistrationToken({
      identifier: normalizedIdentifier,
      identifierType
    });

    return NextResponse.json({
      success: true,
      verified: true,
      registrationToken,
      identifierType,
      message: 'OTP verified successfully. Please set your password to complete registration.'
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
