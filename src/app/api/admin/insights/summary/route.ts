import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CustomerStat = { views: number; cartAdds: number; purchases: number; spent: number; lastActive: string };
type UserOrderStat = { count: number; spent: number; lastAt: string };
type ViewsEntry = { name: string; views: number; purchases: number };
type UserSelect = { id: string; name: string; email: string | null };
type ActivityLogRow = Awaited<ReturnType<typeof prisma.activityLog.findFirst>>;
type OrderWithItems = Awaited<ReturnType<typeof prisma.order.findFirst>> & { items: { productId: string; name: string; quantity: number }[] };

/**
 * GET /api/admin/insights/summary
 * Returns aggregated stats for the Customer Insights dashboard:
 *  - perCustomer: [{userId, views, purchases, spent, lastActive}]
 *  - topViewedNotPurchased: products with most views but fewest purchases
 *  - conversionRate: site-wide (unique purchasers / unique viewers) * 100
 *  - eventTotals: { view, cart_add, wishlist_add, purchase, login }
 */
export async function GET() {
  try {
    // Fetch all required data in parallel
    const [users, activityLogs, orders] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'customer' },
        select: { id: true, name: true, email: true }
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.findMany({
        include: { items: true }
      })
    ]);

    // Aggregate per-customer
    const customerMap: Record<string, CustomerStat> = {};

    users.forEach((u: UserSelect) => {
      customerMap[u.id] = { views: 0, cartAdds: 0, purchases: 0, spent: 0, lastActive: '' };
    });

    activityLogs.forEach((log: NonNullable<ActivityLogRow>) => {
      if (!customerMap[log.userId]) {
        customerMap[log.userId] = { views: 0, cartAdds: 0, purchases: 0, spent: 0, lastActive: log.createdAt.toISOString() };
      }
      const u = customerMap[log.userId];
      const logTime = log.createdAt.toISOString();
      const meta = log.meta as Record<string, unknown>;
      if (log.type === 'view_product') u.views++;
      else if (log.type === 'add_to_cart') u.cartAdds++;
      else if (log.type === 'order_placed') {
        u.purchases++;
        u.spent += Number(meta?.grandTotal || 0);
      }
      if (!u.lastActive || logTime > u.lastActive) {
        u.lastActive = logTime;
      }
    });

    // Cross-check with actual orders for accuracy
    const userOrderMap: Record<string, UserOrderStat> = {};
    orders.forEach((order: NonNullable<OrderWithItems>) => {
      if (!userOrderMap[order.userId]) {
        userOrderMap[order.userId] = { count: 0, spent: 0, lastAt: '' };
      }
      userOrderMap[order.userId].count++;
      if (order.status !== 'Cancelled') {
        userOrderMap[order.userId].spent += order.grandTotal;
      }
      const t = order.createdAt.toISOString();
      if (!userOrderMap[order.userId].lastAt || t > userOrderMap[order.userId].lastAt) {
        userOrderMap[order.userId].lastAt = t;
      }
    });

    Object.entries(userOrderMap).forEach(([userId, data]: [string, UserOrderStat]) => {
      if (!customerMap[userId]) {
        customerMap[userId] = { views: 0, cartAdds: 0, purchases: 0, spent: 0, lastActive: data.lastAt };
      }
      customerMap[userId].purchases = data.count;
      customerMap[userId].spent = data.spent;
      if (!customerMap[userId].lastActive || data.lastAt > customerMap[userId].lastActive) {
        customerMap[userId].lastActive = data.lastAt;
      }
    });

    const userLookup = new Map<string, UserSelect>(users.map((u: UserSelect) => [u.id, u]));
    const perCustomer = Object.entries(customerMap).map(([userId, data]: [string, CustomerStat]) => {
      const uObj = userLookup.get(userId);
      return {
        userId,
        name: uObj?.name ?? 'Guest User',
        email: uObj?.email ?? '',
        views: data.views,
        cartAdds: data.cartAdds,
        purchases: data.purchases,
        spent: data.spent,
        lastActive: data.lastActive || null
      };
    }).sort((a, b) => b.spent - a.spent);

    // Event Totals
    const eventTotals = {
      view: activityLogs.filter((l: NonNullable<ActivityLogRow>) => l.type === 'view_product').length,
      cart_add: activityLogs.filter((l: NonNullable<ActivityLogRow>) => l.type === 'add_to_cart').length,
      wishlist_add: activityLogs.filter((l: NonNullable<ActivityLogRow>) => l.type === 'wishlist_add').length,
      purchase: orders.length,
      login: activityLogs.filter((l: NonNullable<ActivityLogRow>) => l.type === 'login').length
    };

    // Conversion rate
    const uniqueViewers = new Set(
      activityLogs.filter((l: NonNullable<ActivityLogRow>) => l.type === 'view_product').map((l: NonNullable<ActivityLogRow>) => l.userId)
    ).size || 1;
    const uniquePurchasers = new Set(orders.map((o: NonNullable<OrderWithItems>) => o.userId)).size;
    const conversionRate = parseFloat(((uniquePurchasers / uniqueViewers) * 100).toFixed(1));

    // Top viewed but not purchased products
    const viewsPerProduct: Record<string, ViewsEntry> = {};
    activityLogs.forEach((log: NonNullable<ActivityLogRow>) => {
      const meta = log.meta as Record<string, unknown>;
      if (log.type === 'view_product' && meta?.productId) {
        const prodId = String(meta.productId);
        if (!viewsPerProduct[prodId]) {
          viewsPerProduct[prodId] = { name: String(meta.productName || 'Unknown'), views: 0, purchases: 0 };
        }
        viewsPerProduct[prodId].views++;
      }
    });

    orders.forEach((o: NonNullable<OrderWithItems>) => {
      o.items.forEach((item: { productId: string; name: string; quantity: number }) => {
        if (!viewsPerProduct[item.productId]) {
          viewsPerProduct[item.productId] = { name: item.name, views: 0, purchases: 0 };
        }
        viewsPerProduct[item.productId].purchases++;
      });
    });

    const topViewedNotPurchased = Object.entries(viewsPerProduct)
      .filter(([, d]) => d.views > 0)
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        views: data.views,
        purchases: data.purchases,
        ratio: data.purchases > 0 ? (data.views / data.purchases).toFixed(1) : '∞'
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      perCustomer,
      topViewedNotPurchased,
      conversionRate,
      eventTotals
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
