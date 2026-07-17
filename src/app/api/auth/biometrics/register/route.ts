import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId, credentialId } = await request.json();
    if (!userId || !credentialId) {
      return NextResponse.json({ success: false, message: 'User ID and Credential ID are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        biometricsEnabled: true,
        biometricCredentialId: credentialId
      }
    });

    return NextResponse.json({ success: true, message: 'Biometrics registered successfully' });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
