import { NextResponse } from 'next/server';
import { connectMongo, MongooseUser } from '@/db/mongodb';
import { getDb } from '@/db/db';

export async function GET() {
  try {
    let customers: any[] = [];

    // 1. Try MongoDB Atlas
    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        const mongoUsers = await MongooseUser.find({})
          .select('-passwordHash -__v')
          .sort({ createdAt: -1 })
          .lean();

        customers = mongoUsers.map((u: any) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role || 'customer',
          addresses: u.addresses?.length || 0,
          walletBalance: u.walletBalance || 0,
          rewardPoints: u.rewardPoints || 0,
          isVerified: u.isVerified || u.verifiedEmail || u.verifiedPhone || false,
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
          status: 'Active'
        }));
      } catch (err) {
        console.warn('[MongoDB Admin Customers Error] Falling back to LocalDB:', err);
      }
    }

    // 2. Fallback / merge with Local JSON DB
    if (customers.length === 0) {
      const localData = getDb();
      customers = localData.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: u.role || 'customer',
        addresses: u.addresses?.length || 0,
        walletBalance: u.walletBalance || 0,
        rewardPoints: u.rewardPoints || 0,
        isVerified: (u as any).isVerified || false,
        createdAt: (u as any).createdAt || new Date().toISOString(),
        status: 'Active'
      }));
    }

    return NextResponse.json({
      success: true,
      customers,
      total: customers.length
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
