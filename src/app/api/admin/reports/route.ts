import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // daily | weekly | monthly | yearly
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const orders = db.orders.getAll();
    const products = db.products.getAll();
    const users = db.users.getAll();

    const now = new Date();
    let fromDate: Date;
    let toDate = toParam ? new Date(toParam) : now;

    if (fromParam) {
      fromDate = new Date(fromParam);
    } else {
      fromDate = new Date(now);
      if (period === 'daily') fromDate.setDate(fromDate.getDate() - 7);
      else if (period === 'weekly') fromDate.setDate(fromDate.getDate() - 56); // 8 weeks
      else if (period === 'monthly') fromDate.setMonth(fromDate.getMonth() - 12);
      else fromDate.setFullYear(fromDate.getFullYear() - 5);
    }

    const filteredOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= fromDate && d <= toDate;
    });

    // Revenue & counts
    let totalRevenue = 0;
    let totalOrders = filteredOrders.length;
    let cancelledCount = 0;
    let refundTotal = 0;

    filteredOrders.forEach(o => {
      if (!['Cancelled', 'Returned'].includes(o.status)) {
        totalRevenue += o.grandTotal;
      }
      if (o.status === 'Cancelled') cancelledCount++;
      if (o.refundStatus === 'Completed') refundTotal += o.refundAmount || o.grandTotal;
    });

    const aov = totalOrders > 0 ? totalRevenue / (totalOrders - cancelledCount || 1) : 0;

    // Build time-series buckets
    const buckets: Record<string, { revenue: number; orders: number; label: string }> = {};

    const buildLabel = (date: Date) => {
      if (period === 'daily') return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
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

    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = getKey(d);
      if (!buckets[key]) buckets[key] = { revenue: 0, orders: 0, label: buildLabel(d) };
      buckets[key].orders++;
      if (!['Cancelled', 'Returned'].includes(o.status)) buckets[key].revenue += o.grandTotal;
    });

    const trend = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // Best-selling products
    const salesCount: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        if (!salesCount[item.productId]) {
          const prod = products.find(p => p.id === item.productId);
          salesCount[item.productId] = { name: item.name, qty: 0, revenue: 0, category: prod?.category || 'Unknown' };
        }
        salesCount[item.productId].qty += item.quantity;
        salesCount[item.productId].revenue += item.price * item.quantity;
      });
    });

    const topProducts = Object.entries(salesCount)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top customers
    const customerSpend: Record<string, { name: string; email: string; orders: number; spent: number }> = {};
    filteredOrders.forEach(o => {
      const user = users.find(u => u.id === o.userId);
      if (!customerSpend[o.userId]) {
        customerSpend[o.userId] = { name: user?.name || 'Guest', email: user?.email || '', orders: 0, spent: 0 };
      }
      customerSpend[o.userId].orders++;
      customerSpend[o.userId].spent += o.grandTotal;
    });

    const topCustomers = Object.entries(customerSpend)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 10);

    // Sales by category
    const categorySales: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || 'Other';
        categorySales[cat] = (categorySales[cat] || 0) + item.price * item.quantity;
      });
    });

    const salesByCategory = Object.entries(categorySales)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

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
