import { NextResponse } from 'next/server';
import { generateRegistrationToken } from '@/db/auth-helper';
import { cache } from '@/utils/cache';

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

    // Verify against cache
    const cachedRecord = cache.get<{ otpCode: string; expiresAt: number }>(`otp:${normalizedIdentifier}`);
    if (cachedRecord && cachedRecord.otpCode === otpCode && Date.now() < cachedRecord.expiresAt) {
      isValid = true;
      // Delete OTP after successful verification
      cache.delete(`otp:${normalizedIdentifier}`);
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
