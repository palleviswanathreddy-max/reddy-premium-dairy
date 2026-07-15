import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
  }

  const transactions = db.wallet.getByUserId(userId);
  const user = db.users.getById(userId);

  return NextResponse.json({
    success: true,
    balance: user?.walletBalance || 0,
    transactions
  });
}

export async function POST(request: Request) {
  try {
    const { userId, amount, type, description } = await request.json();

    if (!userId || !amount || !type || !description) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const user = db.users.getById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Determine new balance
    let newBalance = user.walletBalance || 0;
    if (type === 'credit') {
      newBalance += amount;
    } else if (type === 'debit') {
      if (newBalance < amount) {
        return NextResponse.json({ success: false, message: 'Insufficient balance' }, { status: 400 });
      }
      newBalance -= amount;
    }

    // Update user balance
    db.users.update(userId, { walletBalance: newBalance });

    // Record transaction
    const tx = db.wallet.addTransaction({
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      type,
      amount,
      balanceAfter: newBalance,
      description,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, transaction: tx, newBalance });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Failed to process transaction' }, { status: 500 });
  }
}
