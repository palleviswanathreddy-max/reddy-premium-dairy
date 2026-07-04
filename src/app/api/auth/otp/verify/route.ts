import { NextResponse } from 'next/server';
import { connectMongo, MongooseOTP, MongooseUser } from '@/db/mongodb';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { phone, otpCode } = await request.json();
    
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    if (!cleanPhone || !otpCode) {
      return NextResponse.json({ success: false, message: 'Phone number and OTP code are required' }, { status: 400 });
    }

    let isValid = false;

    // 1. Verify against MongoDB Atlas
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const record = await MongooseOTP.findOne({ phone: cleanPhone }).sort({ _id: -1 });
        if (record && record.otpCode === otpCode && new Date() < record.expiresAt) {
          isValid = true;
          // Delete OTP after successful verification
          await MongooseOTP.deleteOne({ _id: record._id });
        }
      } catch (err) {
        console.warn('[MongoDB OTP Verification Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Verify against Local JSON DB
    if (!isValid) {
      const localData = getDb();
      const tempOtps = (localData as any).tempOtps || [];
      const match = tempOtps.find((o: any) => o.phone === cleanPhone && o.otpCode === otpCode && new Date() < new Date(o.expiresAt));
      if (match) {
        isValid = true;
        // Clean up
        (localData as any).tempOtps = tempOtps.filter((o: any) => o.phone !== cleanPhone);
        saveDb(localData);
      }
    }

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid or expired OTP code' }, { status: 400 });
    }

    // OTP Verified! Now login or register the user
    let userPayload: any = null;

    if (process.env.MONGODB_URI) {
      // MongoDB lookup/registration
      await connectMongo();
      let mUser = await MongooseUser.findOne({ phone: cleanPhone });
      if (!mUser) {
        // Auto-Register new user
        mUser = new MongooseUser({
          name: `Customer-${cleanPhone.slice(-4)}`,
          email: `${cleanPhone}@reddy-temp.com`, // temp placeholder email
          phone: cleanPhone,
          passwordHash: 'otp-registered-account',
          role: 'customer',
          walletBalance: 100, // starting gift
          rewardPoints: 250,
          addresses: [],
          verifiedPhone: true
        });
        await mUser.save();
      }
      userPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
    } else {
      // LocalDB lookup/registration
      const localData = getDb();
      let lUser = localData.users.find(u => u.phone === cleanPhone || u.phone === `+91 ${cleanPhone}`);
      if (!lUser) {
        // Auto-Register new user
        lUser = {
          id: `user-${cleanPhone}`,
          name: `Customer-${cleanPhone.slice(-4)}`,
          email: `${cleanPhone}@reddy-temp.com`,
          phone: cleanPhone,
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

    // Generate real JWT tokens
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Return success and set secure cookie headers
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: userPayload.id,
        email: userPayload.email,
        role: userPayload.role,
        name: userPayload.name,
        phone: cleanPhone
      }
    });

    // Set HTTP Only Cookie for JWT Session
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60, // 15 mins
      path: '/'
    });
    
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
