import { NextResponse } from 'next/server';
import { connectMongo, MongooseUserActivity } from '@/db/mongodb';
import { db } from '@/db/db';

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
    // ── Local-DB fallback (no MongoDB) ──────────────────────────────────────
    if (!process.env.MONGODB_URI) {
      const orders = db.orders.getAll();
      const users = db.users.getAll();

      // Build per-customer rollup from orders
      const customerMap: Record<string, { views: number; purchases: number; spent: number; lastActive: string }> = {};
      orders.forEach(order => {
        if (!customerMap[order.userId]) {
          customerMap[order.userId] = { views: 0, purchases: 0, spent: 0, lastActive: order.createdAt };
        }
        customerMap[order.userId].purchases += order.items.reduce((s, i) => s + i.quantity, 0);
        customerMap[order.userId].spent += order.grandTotal;
        if (order.createdAt > customerMap[order.userId].lastActive) {
          customerMap[order.userId].lastActive = order.createdAt;
        }
      });

      const perCustomer = users.map(u => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        views: customerMap[u.id]?.views || 0,
        purchases: customerMap[u.id]?.purchases || 0,
        spent: customerMap[u.id]?.spent || 0,
        lastActive: customerMap[u.id]?.lastActive || null
      }));

      // Top products by purchase count (from orders)
      const productPurchases: Record<string, { name: string; count: number; revenue: number }> = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          if (!productPurchases[item.productId]) {
            productPurchases[item.productId] = { name: item.name, count: 0, revenue: 0 };
          }
          productPurchases[item.productId].count += item.quantity;
          productPurchases[item.productId].revenue += item.price * item.quantity;
        });
      });
      const topPurchased = Object.entries(productPurchases)
        .map(([productId, v]) => ({ productId, ...v, views: 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const uniquePurchasers = new Set(orders.map(o => o.userId)).size;
      const totalUsers = users.filter(u => u.role === 'customer').length;
      const conversionRate = totalUsers > 0 ? ((uniquePurchasers / totalUsers) * 100).toFixed(1) : '0.0';

      return NextResponse.json({
        success: true,
        source: 'localdb',
        note: 'MongoDB not connected — view/wishlist/cart tracking unavailable',
        perCustomer,
        topViewedNotPurchased: [],
        topPurchasedProducts: topPurchased,
        conversionRate: parseFloat(conversionRate),
        eventTotals: { view: 0, cart_add: 0, wishlist_add: 0, purchase: 0, login: 0 }
      });
    }

    // ── MongoDB aggregations ─────────────────────────────────────────────────
    await connectMongo();

    const [perCustomerRaw, topViewedRaw, eventTotalsRaw] = await Promise.all([
      // Per-customer rollup
      MongooseUserActivity.aggregate([
        {
          $group: {
            _id: '$userId',
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            cartAdds: { $sum: { $cond: [{ $eq: ['$type', 'cart_add'] }, 1, 0] } },
            wishlistAdds: { $sum: { $cond: [{ $eq: ['$type', 'wishlist_add'] }, 1, 0] } },
            purchases: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$quantity', 0] } },
            spent: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$amount', 0] } },
            lastActive: { $max: '$createdAt' }
          }
        },
        { $sort: { spent: -1 } },
        { $limit: 200 }
      ]),

      // Top viewed products — views vs purchases ratio
      MongooseUserActivity.aggregate([
        { $match: { type: { $in: ['view', 'purchase'] } } },
        {
          $group: {
            _id: '$productId',
            productName: { $first: '$productName' },
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            purchases: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$quantity', 0] } }
          }
        },
        {
          $addFields: {
            conversionRate: {
              $cond: [
                { $gt: ['$views', 0] },
                { $multiply: [{ $divide: ['$purchases', '$views'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { views: -1 } },
        { $limit: 20 }
      ]),

      // Event totals
      MongooseUserActivity.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    // Unique viewers vs unique purchasers for site-wide conversion rate
    const [uniqueViewers, uniquePurchasers] = await Promise.all([
      MongooseUserActivity.distinct('userId', { type: 'view' }),
      MongooseUserActivity.distinct('userId', { type: 'purchase' })
    ]);
    const conversionRate =
      uniqueViewers.length > 0
        ? parseFloat(((uniquePurchasers.length / uniqueViewers.length) * 100).toFixed(1))
        : 0;

    // Top viewed with zero or low purchases
    const topViewedNotPurchased = topViewedRaw
      .filter(p => p.views > 0)
      .sort((a, b) => a.conversionRate - b.conversionRate)
      .slice(0, 10);

    // Event totals map
    const eventTotals: Record<string, number> = {
      view: 0, cart_add: 0, wishlist_add: 0, purchase: 0, login: 0
    };
    eventTotalsRaw.forEach((e: any) => { eventTotals[e._id] = e.count; });

    return NextResponse.json({
      success: true,
      source: 'mongodb',
      perCustomer: perCustomerRaw.map(c => ({ userId: c._id, ...c, _id: undefined })),
      topViewedNotPurchased,
      topPurchasedProducts: topViewedRaw.sort((a, b) => b.purchases - a.purchases).slice(0, 10),
      conversionRate,
      uniqueViewers: uniqueViewers.length,
      uniquePurchasers: uniquePurchasers.length,
      eventTotals
    });
  } catch (err: any) {
    console.error('[admin/insights/summary]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
