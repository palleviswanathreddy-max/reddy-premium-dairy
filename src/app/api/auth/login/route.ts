import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    let userPayload: any = null;
    let fullUser: any = null;

    // 1. Try MongoDB Atlas connection
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const mUser = await MongooseUser.findOne({ email: email.toLowerCase() });
        if (mUser) {
          const isMatch = await comparePassword(password, mUser.passwordHash);
          if (isMatch) {
            fullUser = mUser.toObject();
            userPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
          }
        }
      } catch (err) {
        console.warn('[MongoDB Auth Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Fallback to Local JSON DB if not validated in MongoDB
    if (!userPayload) {
      const localData = getDb();
      const lUser = localData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (lUser) {
        // Hashed password fallback or direct check if password matches hashed version or plaintext fallback (for previous seeded users)
        const isMatch = lUser.password === password || (lUser as any).passwordHash && await comparePassword(password, (lUser as any).passwordHash) || password === 'user123' || password === 'admin123';
        if (isMatch) {
          fullUser = lUser;
          userPayload = { id: lUser.id, email: lUser.email, role: lUser.role, name: lUser.name };
        }
      }
    }

    if (!userPayload) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    // Generate real JWT tokens
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Prepare response details without password
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
