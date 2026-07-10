import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';

const JWT_SECRET = process.env.JWT_SECRET || 'reddy-premium-dairy-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'reddy-premium-dairy-refresh-key-2026';

// Twilio Config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: any): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

// Twilio Real SMS dispatch wrapper
export async function sendRealSMS(toPhone: string, messageBody: string): Promise<{ success: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn(`[SMS Fallback] Twilio credentials missing. SMS content would be:\nTo: ${toPhone}\nMessage: ${messageBody}`);
    return { success: false, error: 'Twilio credentials not configured' };
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: messageBody,
      from: TWILIO_PHONE_NUMBER,
      to: toPhone.startsWith('+') ? toPhone : `+91${toPhone}` // Default to Indian country code if missing
    });
    console.log(`[SMS Success] Real SMS dispatched to ${toPhone}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[SMS Error] Failed to send SMS via Twilio:`, err);
    return { success: false, error: err.message };
  }
}

// Registration Token — short-lived JWT to prove OTP was verified
const REGISTRATION_TOKEN_SECRET = process.env.JWT_SECRET ? `${process.env.JWT_SECRET}-reg` : 'reddy-premium-dairy-reg-token-2026';

export function generateRegistrationToken(payload: { identifier: string; identifierType: 'email' | 'phone' }): string {
  return jwt.sign({ ...payload, purpose: 'registration' }, REGISTRATION_TOKEN_SECRET, { expiresIn: '10m' });
}

export function verifyRegistrationToken(token: string): { identifier: string; identifierType: 'email' | 'phone'; purpose: string } | null {
  try {
    const decoded = jwt.verify(token, REGISTRATION_TOKEN_SECRET) as any;
    if (decoded.purpose !== 'registration') return null;
    return { identifier: decoded.identifier, identifierType: decoded.identifierType, purpose: decoded.purpose };
  } catch (err) {
    return null;
  }
}
