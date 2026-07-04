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
      // Convert to friendly name, e.g. "Jul 2026"
      const dateObj = new Date(m + '-02');
      const label = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { label, revenue: sales };
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
        revenueHistory
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
