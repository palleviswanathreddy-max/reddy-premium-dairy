import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/db/auth-helper';

export async function POST(request: Request) {
  try {
    const { credentialId } = await request.json();
    if (!credentialId) {
      return NextResponse.json({ success: false, message: 'Credential ID is required' }, { status: 400 });
    }

    // Find user by biometric credential in PostgreSQL
    const user = await prisma.user.findFirst({
      where: {
        biometricCredentialId: credentialId,
        biometricsEnabled: true
      },
      include: { addresses: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'No account is linked to this biometric key. Please enable biometrics in account security settings first.'
      }, { status: 404 });
    }

    const userPayload = { id: user.id, email: user.email || '', role: user.role, name: user.name };

    // Generate JWT tokens
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Save refresh token
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Log activity
    prisma.activityLog.create({
      data: { userId: user.id, type: 'login' }
    }).catch(e => console.error('[biometrics login activityLog]', e));

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
        role: user.role,
        name: user.name,
        phone: user.phone || '',
        walletBalance: user.walletBalance || 0,
        rewardPoints: user.rewardPoints || 0,
        addresses: user.addresses || [],
        avatar: user.avatar || null,
        biometricsEnabled: user.biometricsEnabled
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
