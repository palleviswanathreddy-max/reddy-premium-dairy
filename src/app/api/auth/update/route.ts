import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/utils/auth-check';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, ...rawUpdates } = body;
    const targetUserId = userId || authUser.id;

    if (targetUserId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Only allow safe fields to be updated — prevent password hash injection etc.
    const allowedFields = [
      'name', 'avatar', 'gender', 'dob', 'bloodGroup', 'emergencyContact',
      'rewardPoints', 'walletBalance', 'biometricsEnabled', 'biometricCredentialId',
      'emailVerified', 'mobileVerified', 'addresses'
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in rawUpdates) {
        updates[key] = rawUpdates[key];
      }
    }

    // Strip addresses from direct user update — addresses have their own table
    const { addresses: _addresses, ...userUpdates } = updates;

    // Update user in PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: userUpdates,
      include: { addresses: true }
    });

    // Log Activity (fire-and-forget)
    prisma.activityLog.create({
      data: {
        userId: updatedUser.id,
        type: 'profile_update'
      }
    }).catch(e => console.error('[activityLog profile_update]', e));

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({ success: true, user: userWithoutPassword });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
