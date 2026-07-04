import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { name, email, phone, password } = await request.json();
    if (!name || !email || !phone || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    let existingUser = false;
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // 1. Try MongoDB check
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const existing = await MongooseUser.findOne({ 
          $or: [{ email: cleanEmail }, { phone: cleanPhone }] 
        });
        if (existing) {
          existingUser = true;
        }
      } catch (err) {
        console.warn('[MongoDB Atlas Error] Falling back to LocalDB checks:', err);
      }
    }

    // 2. Fallback to Local JSON DB check
    if (!existingUser) {
      const localData = getDb();
      const existing = localData.users.find(u => u.email.toLowerCase() === cleanEmail || u.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
      if (existing) {
        existingUser = true;
      }
    }

    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User with this email or mobile number already exists' }, { status: 409 });
    }

    // Hash Password securely
    const hashed = await hashPassword(password);

    let newUserPayload: any = null;

    if (process.env.MONGODB_URI) {
      // Create user in MongoDB Atlas
      await connectMongo();
      const mUser = new MongooseUser({
        name,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: hashed,
        role: 'customer',
        walletBalance: 0,
        rewardPoints: 100, // starting loyalty bonus
        addresses: [],
        verifiedPhone: true // set verified if signing up
      });
      await mUser.save();
      newUserPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
    } else {
      // Create user in Local DB
      const localData = getDb();
      const lUser = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        password: password, // plaintext for dev access
        passwordHash: hashed,
        name,
        phone: cleanPhone,
        role: 'customer' as const,
        avatar: null,
        addresses: [],
        rewardPoints: 100,
        walletBalance: 0
      };
      localData.users.push(lUser);
      saveDb(localData);
      newUserPayload = { id: lUser.id, email: lUser.email, role: lUser.role, name: lUser.name };
    }

    // Generate real JWT tokens
    const accessToken = generateAccessToken(newUserPayload);
    const refreshToken = generateRefreshToken(newUserPayload);

    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: newUserPayload.id,
        email: newUserPayload.email,
        role: newUserPayload.role,
        name: newUserPayload.name,
        phone: cleanPhone,
        walletBalance: 0,
        rewardPoints: 100,
        addresses: []
      }
    });

    // Set secure HTTP Only cookie headers
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
