import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { db } from '@/db/db';

export async function POST(request: Request) {
  try {
    const { userId, ...updates } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    let updatedUser: any = null;

    // 1. Try MongoDB Atlas Update
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        // Check if userId is a valid MongoDB ObjectId before querying
        const query = userId.match(/^[0-9a-fA-F]{24}$/) ? { _id: userId } : { phone: userId.replace(/\D/g, '') };
        const mUser = await MongooseUser.findOneAndUpdate(query, { $set: updates }, { new: true });
        if (mUser) {
          updatedUser = mUser.toObject();
        }
      } catch (err) {
        console.warn('[MongoDB Atlas Update Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Fallback to Local JSON DB
    if (!updatedUser) {
      const localUser = db.users.update(userId, updates);
      if (localUser) {
        updatedUser = localUser;
      }
    }

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: 'User account not found' }, { status: 404 });
    }

    const { password: _, passwordHash: __, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({ success: true, user: userWithoutPassword });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
