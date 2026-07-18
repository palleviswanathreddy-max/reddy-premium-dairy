import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/utils/auth-check';

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
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, amount, type, description } = await request.json();
    const targetUserId = userId || authUser.id;

    if (targetUserId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (!amount || !type || !description) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
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
        where: { id: targetUserId },
        data: { walletBalance: newBalance }
      }),
      prisma.walletTransaction.create({
        data: {
          userId: targetUserId,
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
