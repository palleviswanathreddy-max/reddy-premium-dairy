import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/utils/auth-check';
import { cache, CacheKeys, getCachedOrFetch } from '@/utils/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || authUser.id;

    if (userId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Cache profile for 5 seconds to reduce database load on rapid successive requests
    const user = await getCachedOrFetch(`profile:${userId}`, async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          avatar: true,
          rewardPoints: true,
          walletBalance: true,
          gender: true,
          dob: true,
          bloodGroup: true,
          emergencyContact: true,
          emailVerified: true,
          mobileVerified: true,
          biometricsEnabled: true,
          biometricCredentialId: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          addresses: true
        }
      });
    }, 5000);

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, name, gender, dob, bloodGroup, emergencyContact } = body;
    const targetUserId = userId || authUser.id;

    if (targetUserId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { name, gender, dob, bloodGroup, emergencyContact },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        rewardPoints: true,
        walletBalance: true,
        gender: true,
        dob: true,
        bloodGroup: true,
        emergencyContact: true,
        emailVerified: true,
        mobileVerified: true,
        biometricsEnabled: true,
        biometricCredentialId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        addresses: true
      }
    });

    // Invalidate user cache & profile cache
    cache.delete(CacheKeys.USER(targetUserId));
    if (updatedUser.email) {
      cache.delete(CacheKeys.USER(updatedUser.email.toLowerCase()));
    }
    cache.delete(`profile:${targetUserId}`);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
