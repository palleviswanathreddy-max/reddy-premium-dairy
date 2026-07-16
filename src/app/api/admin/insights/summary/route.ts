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
      const logs = db.activityLogs.getAll();

      // Aggregate local logs per customer
      const customerMap: Record<string, { views: number; cartAdds: number; purchases: number; spent: number; lastActive: string }> = {};
      
      // Seed with users
      users.forEach(u => {
        customerMap[u.id] = { views: 0, cartAdds: 0, purchases: 0, spent: 0, lastActive: '' };
      });

      // Aggregate event logs
      logs.forEach(log => {
        if (!customerMap[log.userId]) {
          customerMap[log.userId] = { views: 0, cartAdds: 0, purchases: 0, spent: 0, lastActive: log.createdAt };
        }
        const u = customerMap[log.userId];
        if (log.type === 'view_product') u.views++;
        else if (log.type === 'add_to_cart') u.cartAdds++;
        else if (log.type === 'order_placed') {
          u.purchases++;
          u.spent += Number(log.meta?.amount || 0);
        }
        if (!u.lastActive || log.createdAt > u.lastActive) {
          u.lastActive = log.createdAt;
        }
      });

      // Cross-check with actual orders database to be absolutely accurate
      orders.forEach(order => {
        if (!customerMap[order.userId]) {
          customerMap[order.userId] = { views: 0, cartAdds: 0, purchases: 0, spent: 0, lastActive: order.createdAt };
        }
        const u = customerMap[order.userId];
        u.purchases = orders.filter(o => o.userId === order.userId).length;
        u.spent = orders.filter(o => o.userId === order.userId && o.status !== 'Cancelled').reduce((sum, o) => sum + o.grandTotal, 0);
        if (!u.lastActive || order.createdAt > u.lastActive) {
          u.lastActive = order.createdAt;
        }
      });

      const perCustomer = Object.entries(customerMap).map(([userId, data]) => {
        const uObj = users.find(u => u.id === userId);
        return {
          userId,
          name: uObj?.name || 'Guest User',
          email: uObj?.email || '',
          views: data.views,
          cartAdds: data.cartAdds,
          purchases: data.purchases,
          spent: data.spent,
          lastActive: data.lastActive || null
        };
      }).sort((a, b) => b.spent - a.spent);

      // Event Totals
      const eventTotals = {
        view: logs.filter(l => l.type === 'view_product').length,
        cart_add: logs.filter(l => l.type === 'add_to_cart').length,
        wishlist_add: logs.filter(l => l.type === 'wishlist_add').length,
        purchase: orders.length,
        login: logs.filter(l => l.type === 'login').length
      };

      // Unique viewers vs unique purchasers
      const uniqueViewers = new Set(logs.filter(l => l.type === 'view_product').map(l => l.userId)).size || 1;
      const uniquePurchasers = new Set(orders.map(o => o.userId)).size;
      const conversionRate = parseFloat(((uniquePurchasers / uniqueViewers) * 100).toFixed(1));

      // viewed not purchased ratio
      const viewsPerProduct: Record<string, { name: string; views: number; purchases: number }> = {};
      logs.forEach(log => {
        if (log.type === 'view_product' && log.meta?.productId) {
          const prodId = String(log.meta.productId);
          if (!viewsPerProduct[prodId]) {
            viewsPerProduct[prodId] = { name: String(log.meta.productName || 'Unknown'), views: 0, purchases: 0 };
          }
          viewsPerProduct[prodId].views++;
        }
      });
      orders.forEach(o => {
        o.items.forEach(item => {
          if (!viewsPerProduct[item.productId]) {
            viewsPerProduct[item.productId] = { name: item.name, views: 0, purchases: 0 };
          }
          viewsPerProduct[item.productId].purchases += item.quantity;
        });
      });

      const topViewedNotPurchased = Object.entries(viewsPerProduct)
        .map(([productId, data]) => {
          const rate = data.views > 0 ? (data.purchases / data.views) * 100 : 0;
          return {
            _id: productId,
            productName: data.name,
            views: data.views,
            purchases: data.purchases,
            conversionRate: rate
          };
        })
        .sort((a, b) => a.conversionRate - b.conversionRate)
        .slice(0, 10);

      return NextResponse.json({
        success: true,
        source: 'localdb',
        perCustomer,
        topViewedNotPurchased,
        conversionRate,
        uniqueViewers,
        uniquePurchasers,
        eventTotals
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
