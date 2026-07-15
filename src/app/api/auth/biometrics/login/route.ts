import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';
import { getDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { credentialId } = await request.json();
    if (!credentialId) {
      return NextResponse.json({ success: false, message: 'Credential ID is required' }, { status: 400 });
    }

    let fullUser: any = null;
    let userPayload: any = null;

    // 1. Search MongoDB
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const mUser = await MongooseUser.findOne({ biometricCredentialId: credentialId, biometricsEnabled: true });
        if (mUser) {
          fullUser = mUser.toObject();
          userPayload = { id: mUser._id.toString(), email: mUser.email, role: mUser.role, name: mUser.name };
        }
      } catch (err) {
        console.warn('[MongoDB Biometrics Login Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Search Local JSON DB
    if (!userPayload) {
      const localData = getDb();
      const lUser = localData.users.find(u => u.biometricCredentialId === credentialId && u.biometricsEnabled === true);
      if (lUser) {
        fullUser = lUser;
        userPayload = { id: lUser.id, email: lUser.email, role: lUser.role, name: lUser.name };
      }
    }

    if (!userPayload) {
      return NextResponse.json({
        success: false,
        message: 'No account is linked to this biometric key. Please enable biometrics inside account security settings first.'
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
