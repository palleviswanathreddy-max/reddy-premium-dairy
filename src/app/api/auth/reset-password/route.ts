import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { hashPassword } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { identifier, newPassword } = await request.json();

    if (!identifier || !newPassword) {
      return NextResponse.json({ success: false, message: 'Identifier and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Auto-detect email vs phone
    const trimmed = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(trimmed);
    const normalizedIdentifier = isEmail
      ? trimmed.toLowerCase()
      : trimmed.replace(/\D/g, '').slice(-10);

    const hashed = await hashPassword(newPassword);
    let updated = false;

    // 1. Try MongoDB
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const query = isEmail ? { email: normalizedIdentifier } : { phone: normalizedIdentifier };
        const mUser = await MongooseUser.findOne(query);

        if (mUser) {
          mUser.passwordHash = hashed;
          await mUser.save();
          updated = true;
        }
      } catch (err) {
        console.warn('[MongoDB Reset Password Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Fallback to Local DB
    if (!updated) {
      const localData = getDb();
      const userIndex = localData.users.findIndex(u => {
        if (isEmail) return u.email.toLowerCase() === normalizedIdentifier;
        return u.phone.replace(/\D/g, '').slice(-10) === normalizedIdentifier;
      });

      if (userIndex !== -1) {
        // Local fallback (we'll just store plain text for fallback or hash if implemented in DB)
        // For security, ideally we store the hash.
        (localData.users[userIndex] as any).passwordHash = hashed;
        localData.users[userIndex].password = newPassword; // keeping the original insecure field for local legacy support
        saveDb(localData);
        updated = true;
      }
    }

    if (!updated) {
      return NextResponse.json({ success: false, message: 'User not found. Please register.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now login.' });

  } catch (err: any) {
    console.error('Reset Password API Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
