import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET() {
  try {
    const orders = db.orders.getAll();
    const users = db.users.getAll();
    const products = db.products.getAll();

    // Counts
    const orderCount = orders.length;
    const customerCount = users.filter(u => u.role === 'customer').length;
    const productCount = products.length;

    // Distinct categories
    const categories = Array.from(new Set(products.map(p => p.category)));
    const categoryCount = categories.length;

    // Revenues
    let totalRevenue = 0;
    let todaySales = 0;
    let monthlySales = 0;
    let yearlySales = 0;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);
    const yearStr = now.toISOString().slice(0, 4);

    orders.forEach(order => {
      if (order.paymentStatus === 'Paid' || order.status === 'Delivered' || order.paymentMethod !== 'COD') {
        const orderAmt = order.grandTotal;
        totalRevenue += orderAmt;

        const createdDate = order.createdAt.slice(0, 10);
        const createdMonth = order.createdAt.slice(0, 7);
        const createdYear = order.createdAt.slice(0, 4);

        if (createdDate === todayStr) {
          todaySales += orderAmt;
        }
        if (createdMonth === monthStr) {
          monthlySales += orderAmt;
        }
        if (createdYear === yearStr) {
          yearlySales += orderAmt;
        }
      }
    });

    const profit = totalRevenue * 0.22; // Simulated 22% profit margins
    const loss = 0; // Simulated loss

    // Low stock alerts
    const lowStockProducts = products
      .filter(p => p.stock <= 15)
      .map(p => ({ id: p.id, name: p.name, stock: p.stock, sku: p.sku }));

    // Best Sellers calculation
    const salesCount: { [key: string]: { name: string; qty: number; revenue: number } } = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!salesCount[item.productId]) {
          salesCount[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        salesCount[item.productId].qty += item.quantity;
        salesCount[item.productId].revenue += item.price * item.quantity;
      });
    });

    const bestSellers = Object.keys(salesCount)
      .map(id => ({ id, ...salesCount[id] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Sales by Category
    const categorySales: { [key: string]: number } = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const category = prod ? prod.category : 'Fresh Milk';
        categorySales[category] = (categorySales[category] || 0) + (item.price * item.quantity);
      });
    });

    const salesByCategoryData = Object.keys(categorySales).map(category => ({
      category,
      value: categorySales[category]
    }));

    // Monthly revenue chart history (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }

    const revenueHistory = months.map(m => {
      let sales = 0;
      orders.forEach(o => {
        if (o.createdAt.slice(0, 7) === m) {
          sales += o.grandTotal;
        }
      });
      const dateObj = new Date(m + '-02');
      const label = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { label, revenue: sales };
    });

    // Payment method distribution
    const paymentMethodCounts: { [key: string]: { count: number; amount: number } } = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'Unknown';
      if (!paymentMethodCounts[method]) {
        paymentMethodCounts[method] = { count: 0, amount: 0 };
      }
      paymentMethodCounts[method].count += 1;
      paymentMethodCounts[method].amount += order.grandTotal;
    });
    const paymentMethodDistribution = Object.keys(paymentMethodCounts).map(method => ({
      method,
      count: paymentMethodCounts[method].count,
      amount: paymentMethodCounts[method].amount
    }));

    // Payment status breakdown
    const paymentStatusCounts: { [key: string]: number } = {};
    orders.forEach(order => {
      const status = order.paymentStatus || 'Unknown';
      paymentStatusCounts[status] = (paymentStatusCounts[status] || 0) + 1;
    });
    const paymentStatusBreakdown = Object.keys(paymentStatusCounts).map(status => ({
      status,
      count: paymentStatusCounts[status]
    }));

    // Delivery status breakdown
    const deliveryStatusCounts: { [key: string]: number } = {};
    orders.forEach(order => {
      const status = order.status || 'Unknown';
      deliveryStatusCounts[status] = (deliveryStatusCounts[status] || 0) + 1;
    });
    const deliveryStatusBreakdown = Object.keys(deliveryStatusCounts).map(status => ({
      status,
      count: deliveryStatusCounts[status]
    }));

    // Daily revenue for last 7 days
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      let daySales = 0;
      let dayOrders = 0;
      orders.forEach(o => {
        if (o.createdAt.slice(0, 10) === dateStr) {
          daySales += o.grandTotal;
          dayOrders += 1;
        }
      });
      const label = d.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      dailyRevenue.push({ date: dateStr, label, revenue: daySales, orders: dayOrders });
    }

    // Customer acquisition trend (last 6 months)
    const customerAcquisition = months.map(m => {
      let count = 0;
      users.forEach((u: any) => {
        const createdAt = u.createdAt || '';
        if (typeof createdAt === 'string' && createdAt.slice(0, 7) === m) {
          count += 1;
        }
      });
      const dateObj = new Date(m + '-02');
      const label = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { label, count };
    });

    // Total collected vs pending amounts
    let totalCollected = 0;
    let totalPending = 0;
    orders.forEach(order => {
      if (order.paymentStatus === 'Paid') {
        totalCollected += order.grandTotal;
      } else {
        totalPending += order.grandTotal;
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        todaySales,
        monthlySales,
        yearlySales,
        profit,
        loss,
        customerCount,
        orderCount,
        productCount,
        categoryCount,
        lowStockProducts,
        bestSellers,
        salesByCategoryData,
        revenueHistory,
        paymentMethodDistribution,
        paymentStatusBreakdown,
        deliveryStatusBreakdown,
        dailyRevenue,
        customerAcquisition,
        totalCollected,
        totalPending
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
