import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

type ExportType = 'orders' | 'customers' | 'products' | 'inventory' | 'sales' | 'refunds';
type ExportFormat = 'csv' | 'xlsx';

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

function toXLSX(headers: string[], rows: (string | number)[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'orders') as ExportType;
    const format = (searchParams.get('format') || 'csv') as ExportFormat;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const fromDate = from ? new Date(from) : new Date('2000-01-01');
    const toDate = to ? new Date(to) : new Date();

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (type === 'orders') {
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });

      headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Products', 'Subtotal', 'GST', 'Delivery', 'Discount', 'Grand Total', 'Payment Method', 'Payment Status', 'Delivery Status', 'Address'];
      type OrderRow = typeof orders[number];
      rows = orders.map((o: OrderRow) => {
        const addr = o.deliveryAddress as any;
        return [
          o.id,
          new Date(o.createdAt).toLocaleDateString('en-IN'),
          addr?.name || '',
          addr?.phone || '',
          o.items.map((i: any) => `${i.name} x${i.quantity}`).join('; '),
          o.subtotal,
          o.gstTotal,
          o.deliveryCharges,
          o.discount,
          o.grandTotal,
          o.paymentMethod,
          o.paymentStatus,
          o.status,
          addr ? `${addr.street || ''}, ${addr.district || ''}` : ''
        ];
      });
      filename = `orders_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'customers') {
      const users = await prisma.user.findMany({
        where: { role: 'customer' },
        include: {
          orders: { where: { status: { not: 'Cancelled' } } },
          addresses: { select: { id: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      headers = ['ID', 'Name', 'Email', 'Phone', 'Total Orders', 'Total Spending (Rs.)', 'Wallet Balance', 'Reward Points', 'Addresses', 'Registered On'];
      type UserRow = typeof users[number];
      rows = users.map((u: UserRow) => {
        const spent = u.orders.reduce((s: number, o: any) => s + o.grandTotal, 0);
        return [
          u.id, u.name, u.email || '', u.phone || '',
          u.orders.length, spent.toFixed(2),
          u.walletBalance, u.rewardPoints,
          u.addresses.length,
          new Date(u.createdAt).toLocaleDateString('en-IN')
        ];
      });
      filename = `customers_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'products') {
      const products = await prisma.product.findMany({
        include: { category: true },
        orderBy: { name: 'asc' }
      });

      headers = ['ID', 'SKU', 'Name', 'Category', 'MRP (Rs.)', 'Price (Rs.)', 'Discount %', 'GST %', 'Stock', 'Status', 'Rating'];
      type ProductRow = typeof products[number];
      rows = products.map((p: ProductRow) => [
        p.id, p.sku, p.name, p.category?.name || 'Other',
        p.mrp, p.price, p.discount, p.gst,
        p.stock, p.status, p.rating
      ]);
      filename = `products_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'inventory') {
      const products = await prisma.product.findMany({
        include: {
          category: true,
          inventoryLogs: true,
          orderItems: { include: { order: { select: { status: true } } } }
        }
      });

      headers = ['SKU', 'Name', 'Category', 'Current Stock', 'Total Incoming', 'Total Sold', 'Stock Value (Rs.)', 'Status'];
      type InvProductRow = typeof products[number];
      rows = products.map((p: InvProductRow) => {
        const incoming = p.inventoryLogs.filter((l: any) => l.quantity > 0).reduce((s: number, l: any) => s + l.quantity, 0);
        const sold = p.orderItems.filter((i: any) => !['Cancelled', 'Returned'].includes(i.order.status)).reduce((s: number, i: any) => s + i.quantity, 0);
        return [p.sku, p.name, p.category?.name || 'Other', p.stock, incoming, sold, (p.stock * p.price).toFixed(2), p.status];
      });
      filename = `inventory_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'sales') {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
          status: { notIn: ['Cancelled', 'Returned'] }
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });

      headers = ['Date', 'Order ID', 'Items', 'Revenue (Rs.)', 'GST (Rs.)', 'Payment Method'];
      type SalesOrderRow = typeof orders[number];
      rows = orders.map((o: SalesOrderRow) => [
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.id,
        o.items.length,
        o.grandTotal,
        o.gstTotal,
        o.paymentMethod
      ]);
      filename = `sales_report_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'refunds') {
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { status: 'Cancelled' },
            { refundStatus: { not: null } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      headers = ['Order ID', 'Date', 'Customer', 'Grand Total (Rs.)', 'Refund Amount (Rs.)', 'Refund Status', 'Reason', 'Payment Method'];
      type RefundOrderRow = typeof orders[number];
      rows = orders.map((o: RefundOrderRow) => {
        const addr = o.deliveryAddress as any;
        return [
          o.id,
          new Date(o.createdAt).toLocaleDateString('en-IN'),
          addr?.name || '',
          o.grandTotal,
          Number(o.refundAmount) || o.grandTotal,
          o.refundStatus || 'Pending',
          o.cancellationReason || '',
          o.paymentMethod
        ];
      });
      filename = `refunds_${new Date().toISOString().slice(0, 10)}`;
    }

    if (format === 'xlsx') {
      const buffer = toXLSX(headers, rows);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          'Cache-Control': 'no-store'
        }
      });
    } else {
      const csv = toCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
          'Cache-Control': 'no-store'
        }
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
