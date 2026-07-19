import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.toISOString().slice(0, 10));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const queryThreshold = yearStart < sixMonthsAgo ? yearStart : sixMonthsAgo;

    // Fetch all needed data in parallel using optimized queries and aggregations
    const [
      totalRevenueAgg,
      totalCollectedAgg,
      totalPendingAgg,
      cancelledCount,
      completedRefundOrders,
      pendingRefunds,
      orderCount,
      products,
      customerCount,
      recentUsers,
      categoryCount,
      orders,
      paymentMethodGroups,
      paymentStatusGroups,
      deliveryStatusGroups
    ] = await Promise.all([
      // 1. All-time revenue & sales aggregates
      prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: { NOT: { status: 'Cancelled' } }
      }),
      prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: { paymentStatus: 'Paid' }
      }),
      prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: {
          NOT: [
            { status: 'Cancelled' },
            { paymentStatus: 'Paid' }
          ]
        }
      }),
      // 2. Cancellation and refunds
      prisma.order.count({ where: { status: 'Cancelled' } }),
      prisma.order.findMany({
        where: { refundStatus: 'Completed' },
        select: { refundAmount: true, grandTotal: true }
      }),
      prisma.order.count({
        where: {
          status: 'Cancelled',
          OR: [
            { refundStatus: null },
            { refundStatus: 'Pending' }
          ]
        }
      }),
      // 3. Overall catalog / user totals
      prisma.order.count(),
      prisma.product.findMany({
        select: { id: true, name: true, sku: true, stock: true, status: true, price: true }
      }),
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.user.findMany({
        where: {
          role: 'customer',
          createdAt: { gte: sixMonthsAgo }
        },
        select: { createdAt: true }
      }),
      prisma.category.count(),
      // 4. Dynamic threshold order list (for charts, top products, top customers)
      prisma.order.findMany({
        where: {
          createdAt: { gte: queryThreshold }
        },
        select: {
          id: true,
          userId: true,
          grandTotal: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          refundStatus: true,
          refundAmount: true,
          createdAt: true,
          user: { select: { name: true } },
          items: {
            select: {
              productId: true,
              name: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  category: {
                    select: { name: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // 5. All-time GroupBy aggregations
      prisma.order.groupBy({
        by: ['paymentMethod'],
        _count: { id: true },
        _sum: { grandTotal: true }
      }),
      prisma.order.groupBy({
        by: ['paymentStatus'],
        _count: { id: true }
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ]);

    // Parse aggregates
    const totalRevenue = totalRevenueAgg._sum.grandTotal || 0;
    const totalCollected = totalCollectedAgg._sum.grandTotal || 0;
    const totalPending = totalPendingAgg._sum.grandTotal || 0;
    const refundTotal = completedRefundOrders.reduce((sum, o) => sum + (o.refundAmount || o.grandTotal), 0);
    const profit = totalRevenue * 0.22;

    // Recent sales metrics
    let todaySales = 0, weeklySales = 0, monthlySales = 0, yearlySales = 0;
    orders.forEach((order: any) => {
      if (order.status !== 'Cancelled') {
        const amt = order.grandTotal;
        if (order.createdAt >= todayStart) todaySales += amt;
        if (order.createdAt >= weekAgo) weeklySales += amt;
        if (order.createdAt >= monthStart) monthlySales += amt;
        if (order.createdAt >= yearStart) yearlySales += amt;
      }
    });

    // Low stock alerts
    const lowStockProducts = products
      .filter((p: any) => p.stock <= 15)
      .map((p: any) => ({ id: p.id, name: p.name, stock: p.stock, sku: p.sku, status: p.status }));

    // Best Sellers (computed over dynamic threshold orders)
    const salesCount: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach((order: any) => {
      if (order.status === 'Cancelled') return;
      order.items.forEach((item: any) => {
        if (!salesCount[item.productId]) salesCount[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        salesCount[item.productId].qty += item.quantity;
        salesCount[item.productId].revenue += item.price * item.quantity;
      });
    });
    const bestSellers = Object.entries(salesCount)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Top Customers (computed over dynamic threshold orders)
    const customerSpend: Record<string, { name: string; orders: number; spent: number }> = {};
    orders.forEach((o: any) => {
      if (o.status === 'Cancelled') return;
      const deliveryAddr = o as any;
      if (!customerSpend[o.userId]) {
        customerSpend[o.userId] = {
          name: o.user?.name || deliveryAddr?.deliveryAddress?.name || 'Guest',
          orders: 0,
          spent: 0
        };
      }
      customerSpend[o.userId].orders++;
      customerSpend[o.userId].spent += o.grandTotal;
    });
    const topCustomers = Object.entries(customerSpend)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    // Sales by Category
    const categorySales: Record<string, number> = {};
    orders.forEach((order: any) => {
      if (order.status === 'Cancelled') return;
      order.items.forEach((item: any) => {
        const cat = item.product?.category?.name || 'Other';
        categorySales[cat] = (categorySales[cat] || 0) + item.price * item.quantity;
      });
    });
    const salesByCategoryData = Object.entries(categorySales)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

    // Monthly revenue history (last 6 months)
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    const revenueHistory = months.map((m: any) => {
      let sales = 0;
      orders.forEach((o: any) => {
        if (o.status !== 'Cancelled' && o.createdAt.toISOString().slice(0, 7) === m) sales += o.grandTotal;
      });
      const label = new Date(m + '-02').toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { label, revenue: sales };
    });

    const lastMonth = revenueHistory[revenueHistory.length - 2]?.revenue || 0;
    const thisMonth = revenueHistory[revenueHistory.length - 1]?.revenue || 0;
    const monthlyGrowthRate = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : null;

    // Daily revenue (last 7 days)
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      let daySales = 0, dayOrders = 0;
      orders.forEach((o: any) => {
        if (o.createdAt.toISOString().slice(0, 10) === dateStr) {
          if (o.status !== 'Cancelled') daySales += o.grandTotal;
          dayOrders++;
        }
      });
      const label = d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      dailyRevenue.push({ date: dateStr, label, revenue: daySales, orders: dayOrders });
    }

    // Payment method distribution
    const paymentMethodDistribution = paymentMethodGroups.map(g => ({
      method: g.paymentMethod || 'Unknown',
      count: g._count.id,
      amount: g._sum.grandTotal || 0
    }));

    // Payment & delivery status breakdown
    const paymentStatusBreakdown = paymentStatusGroups.map(g => ({
      status: g.paymentStatus || 'Unknown',
      count: g._count.id
    }));

    const deliveryStatusBreakdown = deliveryStatusGroups.map(g => ({
      status: g.status || 'Unknown',
      count: g._count.id
    }));

    // Customer acquisition trend (last 6 months)
    const customerAcquisition = months.map((m: any) => {
      const count = recentUsers.filter((u: any) => u.createdAt.toISOString().slice(0, 7) === m).length;
      const label = new Date(m + '-02').toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { label, count };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue, todaySales, weeklySales, monthlySales, yearlySales,
        profit, loss: 0,
        customerCount,
        orderCount,
        productCount: products.length,
        categoryCount,
        cancelledCount, refundTotal, pendingRefunds, monthlyGrowthRate,
        totalCollected, totalPending,
        lowStockProducts, bestSellers, topCustomers,
        salesByCategoryData, revenueHistory, dailyRevenue,
        paymentMethodDistribution, paymentStatusBreakdown, deliveryStatusBreakdown,
        customerAcquisition
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
