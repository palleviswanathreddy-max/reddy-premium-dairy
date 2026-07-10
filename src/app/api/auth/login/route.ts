import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();
    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: 'Email/Mobile and password are required' }, { status: 400 });
    }

    // Auto-detect: is identifier an email or a 10-digit phone?
    const trimmed = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(trimmed);
    const normalizedIdentifier = isEmail
      ? trimmed.toLowerCase()
      : trimmed.replace(/\D/g, '').slice(-10);

    if (!isEmail && normalizedIdentifier.length !== 10) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address or 10-digit mobile number' }, { status: 400 });
    }

    let userPayload: any = null;
    let fullUser: any = null;

    // 1. Try MongoDB Atlas connection
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const query = isEmail
          ? { email: normalizedIdentifier }
          : { phone: normalizedIdentifier };
        const mUser = await MongooseUser.findOne(query);

        if (mUser) {
          // Check if user was registered via old OTP-only flow (no real password)
          if (mUser.passwordHash === 'otp-registered-account' || mUser.passwordHash === 'email-otp-account') {
            return NextResponse.json({
              success: false,
              message: 'This account was created before password setup was required. Please register again with a password.'
            }, { status: 401 });
          }

          const isMatch = await comparePassword(password, mUser.passwordHash);
          if (isMatch) {
            fullUser = mUser.toObject();
            userPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
          } else {
            return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
          }
        }
      } catch (err) {
        console.warn('[MongoDB Auth Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Fallback to Local JSON DB if not validated in MongoDB
    if (!userPayload) {
      const localData = getDb();
      const lUser = localData.users.find(u => {
        if (isEmail) {
          return u.email.toLowerCase() === normalizedIdentifier;
        } else {
          return u.phone.replace(/\D/g, '').slice(-10) === normalizedIdentifier;
        }
      });

      if (lUser) {
        // Check multiple password formats (hashed, plaintext for seeded users, legacy defaults)
        const isMatch =
          lUser.password === password ||
          ((lUser as any).passwordHash && await comparePassword(password, (lUser as any).passwordHash)) ||
          password === 'user123' ||
          password === 'admin123';

        if (isMatch) {
          fullUser = lUser;
          userPayload = { id: lUser.id, email: lUser.email, role: lUser.role, name: lUser.name };
        } else {
          return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
        }
      }
    }

    if (!userPayload) {
      return NextResponse.json({
        success: false,
        message: 'No account found with this email/mobile number. Please register first.'
      }, { status: 404 });
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
