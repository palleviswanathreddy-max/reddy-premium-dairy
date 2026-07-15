import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { getDb, saveDb } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { userId, credentialId } = await request.json();
    if (!userId || !credentialId) {
      return NextResponse.json({ success: false, message: 'User ID and Credential ID are required' }, { status: 400 });
    }

    let updated = false;

    // 1. Update MongoDB
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const mUser = await MongooseUser.findByIdAndUpdate(
          userId,
          { biometricsEnabled: true, biometricCredentialId: credentialId },
          { new: true }
        );
        if (mUser) updated = true;
      } catch (err) {
        console.warn('[MongoDB Biometrics Register Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Update Local JSON DB
    if (!updated) {
      const localData = getDb();
      const lUser = localData.users.find(u => u.id === userId);
      if (lUser) {
        lUser.biometricsEnabled = true;
        lUser.biometricCredentialId = credentialId;
        saveDb(localData);
        updated = true;
      }
    }

    if (!updated) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Biometrics registered successfully' });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
