import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = db.orders.getAll();
    const users = db.users.getAll();
    const products = db.products.getAll();

    // Counts
    const orderCount = orders.length;
    const customerCount = users.filter(u => u.role === 'customer').length;
    const productCount = products.length;
    const categoryCount = new Set(products.map(p => p.category)).size;

    // Revenue accumulators
    let totalRevenue = 0, todaySales = 0, monthlySales = 0, yearlySales = 0;
    let weeklySales = 0, totalCollected = 0, totalPending = 0;
    let cancelledCount = 0, refundTotal = 0;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);
    const yearStr = now.toISOString().slice(0, 4);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    orders.forEach(order => {
      const isCancelled = order.status === 'Cancelled';
      if (isCancelled) cancelledCount++;
      if (order.refundStatus === 'Completed') refundTotal += order.refundAmount || order.grandTotal;

      if (!isCancelled) {
        const amt = order.grandTotal;
        totalRevenue += amt;

        const createdDate = order.createdAt.slice(0, 10);
        if (createdDate === todayStr) todaySales += amt;
        if (createdDate >= weekAgo) weeklySales += amt;
        if (order.createdAt.slice(0, 7) === monthStr) monthlySales += amt;
        if (order.createdAt.slice(0, 4) === yearStr) yearlySales += amt;
      }

      if (order.paymentStatus === 'Paid') totalCollected += order.grandTotal;
      else if (!isCancelled) totalPending += order.grandTotal;
    });

    const profit = totalRevenue * 0.22;

    // Low stock alerts
    const lowStockProducts = products
      .filter(p => p.stock <= 15)
      .map(p => ({ id: p.id, name: p.name, stock: p.stock, sku: p.sku, status: p.status }));

    // Best Sellers
    const salesCount: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach(order => {
      if (order.status === 'Cancelled') return;
      order.items.forEach(item => {
        if (!salesCount[item.productId]) salesCount[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        salesCount[item.productId].qty += item.quantity;
        salesCount[item.productId].revenue += item.price * item.quantity;
      });
    });
    const bestSellers = Object.entries(salesCount)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Top Customers
    const customerSpend: Record<string, { name: string; orders: number; spent: number }> = {};
    orders.forEach(o => {
      if (o.status === 'Cancelled') return;
      const user = users.find(u => u.id === o.userId);
      if (!customerSpend[o.userId]) {
        customerSpend[o.userId] = { name: user?.name || o.deliveryAddress.name, orders: 0, spent: 0 };
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
    orders.forEach(order => {
      if (order.status === 'Cancelled') return;
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || 'Other';
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
    const revenueHistory = months.map(m => {
      let sales = 0;
      orders.forEach(o => {
        if (o.status !== 'Cancelled' && o.createdAt.slice(0, 7) === m) sales += o.grandTotal;
      });
      const label = new Date(m + '-02').toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { label, revenue: sales };
    });

    // Monthly growth rate (last 2 months)
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
      orders.forEach(o => {
        if (o.createdAt.slice(0, 10) === dateStr) {
          if (o.status !== 'Cancelled') daySales += o.grandTotal;
          dayOrders++;
        }
      });
      const label = d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      dailyRevenue.push({ date: dateStr, label, revenue: daySales, orders: dayOrders });
    }

    // Payment method distribution
    const paymentMethodCounts: Record<string, { count: number; amount: number }> = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'Unknown';
      if (!paymentMethodCounts[method]) paymentMethodCounts[method] = { count: 0, amount: 0 };
      paymentMethodCounts[method].count++;
      paymentMethodCounts[method].amount += order.grandTotal;
    });
    const paymentMethodDistribution = Object.entries(paymentMethodCounts)
      .map(([method, v]) => ({ method, ...v }));

    // Payment & delivery status breakdowns
    const paymentStatusCounts: Record<string, number> = {};
    const deliveryStatusCounts: Record<string, number> = {};
    orders.forEach(order => {
      const ps = order.paymentStatus || 'Unknown';
      const ds = order.status || 'Unknown';
      paymentStatusCounts[ps] = (paymentStatusCounts[ps] || 0) + 1;
      deliveryStatusCounts[ds] = (deliveryStatusCounts[ds] || 0) + 1;
    });
    const paymentStatusBreakdown = Object.entries(paymentStatusCounts).map(([status, count]) => ({ status, count }));
    const deliveryStatusBreakdown = Object.entries(deliveryStatusCounts).map(([status, count]) => ({ status, count }));

    // Customer acquisition trend (last 6 months)
    const customerAcquisition = months.map(m => {
      let count = 0;
      users.forEach(u => {
        const createdAt = (u as { createdAt?: string }).createdAt || '';
        if (typeof createdAt === 'string' && createdAt.slice(0, 7) === m) count++;
      });
      const label = new Date(m + '-02').toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { label, count };
    });

    // Pending refunds count
    const pendingRefunds = orders.filter(o => o.status === 'Cancelled' && (!o.refundStatus || o.refundStatus === 'Pending')).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue, todaySales, weeklySales, monthlySales, yearlySales,
        profit, loss: 0,
        customerCount, orderCount, productCount, categoryCount,
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
