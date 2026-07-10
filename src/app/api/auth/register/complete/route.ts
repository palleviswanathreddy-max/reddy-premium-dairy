import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { verifyRegistrationToken, hashPassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { registrationToken, name, password } = await request.json();

    if (!registrationToken || !name || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required (name, password, and registration token)' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // VERIFY REGISTRATION TOKEN (proves OTP was verified)
    // ──────────────────────────────────────────────
    const tokenData = verifyRegistrationToken(registrationToken);
    if (!tokenData) {
      return NextResponse.json({
        success: false,
        message: 'Registration session expired. Please verify your OTP again.'
      }, { status: 401 });
    }

    const { identifier, identifierType } = tokenData;

    // ──────────────────────────────────────────────
    // RACE CONDITION GUARD: Double-check not already registered
    // ──────────────────────────────────────────────
    let alreadyExists = false;

    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const query = identifierType === 'email'
          ? { email: identifier }
          : { phone: identifier };
        const existing = await MongooseUser.findOne(query);
        if (existing) alreadyExists = true;
      } catch (err) {
        console.warn('[MongoDB Check Error] Falling back to LocalDB:', err);
      }
    }

    if (!alreadyExists) {
      const localData = getDb();
      const existing = localData.users.find(u => {
        if (identifierType === 'email') {
          return u.email.toLowerCase() === identifier;
        } else {
          return u.phone.replace(/\D/g, '').slice(-10) === identifier;
        }
      });
      if (existing) alreadyExists = true;
    }

    if (alreadyExists) {
      return NextResponse.json({
        success: false,
        message: 'This email or mobile number is already registered. Please log in instead.'
      }, { status: 409 });
    }

    // ──────────────────────────────────────────────
    // CREATE USER ACCOUNT
    // ──────────────────────────────────────────────
    const hashedPassword = await hashPassword(password);
    const cleanName = name.trim();

    let newUserPayload: any = null;

    if (process.env.MONGODB_URI) {
      await connectMongo();
      const userData: any = {
        name: cleanName,
        email: identifierType === 'email' ? identifier : `${identifier}@reddy-mobile.com`,
        phone: identifierType === 'phone' ? identifier : '',
        passwordHash: hashedPassword,
        role: 'customer',
        walletBalance: 0,
        rewardPoints: 100,
        addresses: [],
        verifiedEmail: identifierType === 'email',
        verifiedPhone: identifierType === 'phone',
        isVerified: true
      };
      const mUser = new MongooseUser(userData);
      await mUser.save();
      newUserPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
    } else {
      const localData = getDb();
      const lUser = {
        id: `user-${Date.now()}`,
        name: cleanName,
        email: identifierType === 'email' ? identifier : `${identifier}@reddy-mobile.com`,
        phone: identifierType === 'phone' ? identifier : '',
        password: password,
        passwordHash: hashedPassword,
        role: 'customer' as const,
        avatar: null,
        addresses: [] as any[],
        rewardPoints: 100,
        walletBalance: 0,
        isVerified: true
      };
      localData.users.push(lUser);
      saveDb(localData);
      newUserPayload = { id: lUser.id, email: lUser.email, role: lUser.role, name: lUser.name };
    }

    // ──────────────────────────────────────────────
    // ISSUE JWT TOKENS & AUTO-LOGIN
    // ──────────────────────────────────────────────
    const accessToken = generateAccessToken(newUserPayload);
    const refreshToken = generateRefreshToken(newUserPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful! Welcome to Reddy Premium Dairy.',
      user: {
        id: newUserPayload.id,
        email: newUserPayload.email,
        role: newUserPayload.role,
        name: newUserPayload.name,
        phone: identifierType === 'phone' ? identifier : '',
        walletBalance: 0,
        rewardPoints: 100,
        addresses: []
      }
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
