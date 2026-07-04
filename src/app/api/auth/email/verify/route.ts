import { NextResponse } from 'next/server';
import { connectMongo, MongooseOTP, MongooseUser } from '@/db/mongodb';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { email, otpCode } = await request.json();

    if (!email || !otpCode) {
      return NextResponse.json({ success: false, message: 'Email and OTP code are required' }, { status: 400 });
    }

    let isValid = false;
    const emailKey = `email:${email}`;

    // Verify against MongoDB Atlas
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const record = await MongooseOTP.findOne({ phone: emailKey }).sort({ _id: -1 });
        if (record && record.otpCode === otpCode && new Date() < record.expiresAt) {
          isValid = true;
          await MongooseOTP.deleteOne({ _id: record._id });
        }
      } catch (err) {
        console.warn('[MongoDB Email OTP Verification Error] Falling back to LocalDB:', err);
      }
    }

    // Verify against Local JSON DB
    if (!isValid) {
      const localData = getDb();
      const tempOtps = (localData as any).tempOtps || [];
      const match = tempOtps.find((o: any) => o.phone === emailKey && o.otpCode === otpCode && new Date() < new Date(o.expiresAt));
      if (match) {
        isValid = true;
        (localData as any).tempOtps = tempOtps.filter((o: any) => o.phone !== emailKey);
        saveDb(localData);
      }
    }

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Get or create user
    let userPayload: any = null;

    if (process.env.MONGODB_URI) {
      await connectMongo();
      let mUser = await MongooseUser.findOne({ email: email.toLowerCase() });
      if (!mUser) {
        mUser = new MongooseUser({
          name: email.split('@')[0],
          email: email.toLowerCase(),
          phone: '',
          passwordHash: 'email-otp-account',
          role: 'customer',
          walletBalance: 100,
          rewardPoints: 250,
          addresses: [],
          verifiedEmail: true
        });
        await mUser.save();
      }
      userPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
    } else {
      const localData = getDb();
      let lUser = localData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!lUser) {
        lUser = {
          id: `user-${Date.now()}`,
          name: email.split('@')[0],
          email: email.toLowerCase(),
          phone: '',
          role: 'customer',
          avatar: null,
          walletBalance: 100,
          rewardPoints: 250,
          addresses: []
        };
        localData.users.push(lUser);
        saveDb(localData);
      }
      userPayload = { id: lUser.id, email: lUser.email, role: lUser.role, name: lUser.name };
    }

    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    const response = NextResponse.json({
      success: true,
      user: { id: userPayload.id, email: userPayload.email, role: userPayload.role, name: userPayload.name }
    });

    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60,
      path: '/'
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
