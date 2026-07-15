import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ success: false, message: 'Phone number is required' }, { status: 400 });
    }

    // Normalize phone number to last 10 digits
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    if (normalizedPhone.length !== 10) {
      return NextResponse.json({ success: false, message: 'Invalid phone number format' }, { status: 400 });
    }

    let fullUser: any = null;
    let userPayload: any = null;

    // 1. Check MongoDB
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        let mUser = await MongooseUser.findOne({ phone: normalizedPhone });
        if (!mUser) {
          // Auto-register in MongoDB
          mUser = await MongooseUser.create({
            name: `User ${normalizedPhone}`,
            email: `${normalizedPhone}@reddy.com`,
            phone: normalizedPhone,
            role: 'customer',
            passwordHash: 'otp-registered-account',
            avatar: null,
            addresses: [],
            rewardPoints: 0,
            walletBalance: 0,
            createdAt: new Date().toISOString()
          });
        }
        fullUser = mUser.toObject();
        userPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
      } catch (err) {
        console.warn('[MongoDB Auth Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Local JSON DB check and auto-register
    if (!userPayload) {
      const localData = getDb();
      let lUser = localData.users.find(u => u.phone.replace(/\D/g, '').slice(-10) === normalizedPhone);
      
      if (!lUser) {
        // Auto-register in LocalDB
        const newId = `usr-${Date.now()}`;
        lUser = {
          id: newId,
          email: `${normalizedPhone}@reddy.com`,
          name: `User ${normalizedPhone}`,
          role: 'customer',
          phone: normalizedPhone,
          avatar: null,
          addresses: [],
          rewardPoints: 0,
          walletBalance: 0,
          password: 'otp-registered-account'
        };
        localData.users.push(lUser);
        saveDb(localData);
      }
      fullUser = lUser;
      userPayload = { id: lUser.id, email: lUser.email, role: lUser.role, name: lUser.name };
    }

    // Generate real JWT tokens
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Prepare response without sensitive fields
    const { password: _, passwordHash: __, ...safeUser } = fullUser;

    const response = NextResponse.json({
      success: true,
      user: {
        id: userPayload.id,
        email: userPayload.email,
        role: userPayload.role,
        name: userPayload.name,
        phone: safeUser.phone,
        walletBalance: safeUser.walletBalance || 0,
        rewardPoints: safeUser.rewardPoints || 0,
        addresses: safeUser.addresses || [],
        avatar: safeUser.avatar || null
      }
    });

    // Set Secure HTTP-Only Cookie headers
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
