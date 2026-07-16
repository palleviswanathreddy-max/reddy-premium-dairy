import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // daily | weekly | monthly | yearly
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();
    let fromDate: Date;
    const toDate = toParam ? new Date(toParam) : now;

    if (fromParam) {
      fromDate = new Date(fromParam);
    } else {
      fromDate = new Date(now);
      if (period === 'daily') fromDate.setDate(fromDate.getDate() - 7);
      else if (period === 'weekly') fromDate.setDate(fromDate.getDate() - 56);
      else if (period === 'monthly') fromDate.setMonth(fromDate.getMonth() - 12);
      else fromDate.setFullYear(fromDate.getFullYear() - 5);
    }

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate }
      },
      include: {
        items: {
          include: {
            product: { include: { category: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Revenue & counts
    let totalRevenue = 0;
    const totalOrders = orders.length;
    let cancelledCount = 0;
    let refundTotal = 0;

    orders.forEach((o: any) => {
      if (!['Cancelled', 'Returned'].includes(o.status)) {
        totalRevenue += o.grandTotal;
      }
      if (o.status === 'Cancelled') cancelledCount++;
      if (o.refundStatus === 'Completed') refundTotal += Number(o.refundAmount) || o.grandTotal;
    });

    const aov = totalOrders > 0 ? totalRevenue / (totalOrders - cancelledCount || 1) : 0;

    // Build time-series buckets
    const buckets: Record<string, { revenue: number; orders: number; label: string }> = {};

    const buildLabel = (date: Date) => {
      if (period === 'daily') return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      if (period === 'weekly') {
        return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('en-IN', { month: 'short' })}`;
      }
      if (period === 'monthly') return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      return String(date.getFullYear());
    };

    const getKey = (date: Date) => {
      if (period === 'daily') return date.toISOString().slice(0, 10);
      if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().slice(0, 10);
      }
      if (period === 'monthly') return date.toISOString().slice(0, 7);
      return String(date.getFullYear());
    };

    orders.forEach((o: any) => {
      const d = new Date(o.createdAt);
      const key = getKey(d);
      if (!buckets[key]) buckets[key] = { revenue: 0, orders: 0, label: buildLabel(d) };
      buckets[key].orders++;
      if (!['Cancelled', 'Returned'].includes(o.status)) buckets[key].revenue += o.grandTotal;
    });

    const trend = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]: [string, any]) => v);

    // Best-selling products
    const salesCount: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    orders.forEach((o: any) => {
      o.items.forEach((item: any) => {
        if (!salesCount[item.productId]) {
          salesCount[item.productId] = {
            name: item.name,
            qty: 0,
            revenue: 0,
            category: item.product?.category?.name || 'Other'
          };
        }
        salesCount[item.productId].qty += item.quantity;
        salesCount[item.productId].revenue += item.price * item.quantity;
      });
    });

    const topProducts = Object.entries(salesCount)
      .map(([id, v]: [string, any]) => ({ id, ...v }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top customers
    const customerSpend: Record<string, { name: string; email: string; orders: number; spent: number }> = {};
    orders.forEach((o: any) => {
      if (!customerSpend[o.userId]) {
        customerSpend[o.userId] = {
          name: o.user?.name || 'Guest',
          email: o.user?.email || '',
          orders: 0,
          spent: 0
        };
      }
      customerSpend[o.userId].orders++;
      customerSpend[o.userId].spent += o.grandTotal;
    });

    const topCustomers = Object.entries(customerSpend)
      .map(([id, v]: [string, any]) => ({ id, ...v }))
      .sort((a: any, b: any) => b.spent - a.spent)
      .slice(0, 10);

    // Sales by category
    const categorySales: Record<string, number> = {};
    orders.forEach((o: any) => {
      o.items.forEach((item: any) => {
        const cat = item.product?.category?.name || 'Other';
        categorySales[cat] = (categorySales[cat] || 0) + item.price * item.quantity;
      });
    });

    const salesByCategory = Object.entries(categorySales)
      .map(([category, value]: [string, number]) => ({ category, value }))
      .sort((a: any, b: any) => b.value - a.value);

    return NextResponse.json({
      success: true,
      period,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      summary: {
        totalRevenue,
        totalOrders,
        cancelledCount,
        refundTotal,
        aov,
        cancelRate: totalOrders > 0 ? ((cancelledCount / totalOrders) * 100).toFixed(1) : '0'
      },
      trend,
      topProducts,
      topCustomers,
      salesByCategory
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
