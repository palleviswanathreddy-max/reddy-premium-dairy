import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    balance: user?.walletBalance || 0,
    transactions: transactions.map((t: any) => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt.toISOString()
    }))
  });
}

export async function POST(request: Request) {
  try {
    const { userId, amount, type, description } = await request.json();

    if (!userId || !amount || !type || !description) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Determine new balance
    let newBalance = Number(user.walletBalance) || 0;
    if (type === 'credit') {
      newBalance += Number(amount);
    } else if (type === 'debit') {
      if (newBalance < Number(amount)) {
        return NextResponse.json({ success: false, message: 'Insufficient balance' }, { status: 400 });
      }
      newBalance -= Number(amount);
    }

    // Atomic update: balance + transaction record
    const [, tx] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: newBalance }
      }),
      prisma.walletTransaction.create({
        data: {
          userId,
          type,
          amount: Number(amount),
          balanceAfter: newBalance,
          description
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      transaction: {
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        createdAt: tx.createdAt.toISOString()
      },
      newBalance
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Failed to process transaction' }, { status: 500 });
  }
}


