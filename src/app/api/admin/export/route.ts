import { NextResponse } from 'next/server';
import { db } from '@/db/db';
// xlsx is imported dynamically to avoid SSR issues
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
      const orders = db.orders.getAll().filter(o => {
        const d = new Date(o.createdAt);
        return d >= fromDate && d <= toDate;
      });

      headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Products', 'Subtotal', 'GST', 'Delivery', 'Discount', 'Grand Total', 'Payment Method', 'Payment Status', 'Delivery Status', 'Address'];
      rows = orders.map(o => [
        o.id,
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.deliveryAddress.name,
        o.deliveryAddress.phone,
        o.items.map(i => `${i.name} x${i.quantity}`).join('; '),
        o.subtotal,
        o.gstTotal,
        o.deliveryCharges,
        o.discount,
        o.grandTotal,
        o.paymentMethod,
        o.paymentStatus,
        o.status,
        `${o.deliveryAddress.street}, ${o.deliveryAddress.district}`
      ]);
      filename = `orders_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'customers') {
      const users = db.users.getAll().filter(u => u.role === 'customer');
      const orders = db.orders.getAll();

      headers = ['ID', 'Name', 'Email', 'Phone', 'Total Orders', 'Total Spending (Rs.)', 'Wallet Balance', 'Reward Points', 'Addresses', 'Registered On'];
      rows = users.map(u => {
        const userOrders = orders.filter(o => o.userId === u.id && o.status !== 'Cancelled');
        const spent = userOrders.reduce((s, o) => s + o.grandTotal, 0);
        return [
          u.id, u.name, u.email, u.phone,
          userOrders.length, spent.toFixed(2),
          u.walletBalance || 0, u.rewardPoints || 0,
          u.addresses?.length || 0,
          (u as any).createdAt ? new Date((u as any).createdAt).toLocaleDateString('en-IN') : 'N/A'
        ];
      });
      filename = `customers_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'products') {
      const products = db.products.getAll();

      headers = ['ID', 'SKU', 'Name', 'Category', 'MRP (Rs.)', 'Price (Rs.)', 'Discount %', 'GST %', 'Stock', 'Status', 'Rating'];
      rows = products.map(p => [
        p.id, p.sku, p.name, p.category,
        p.mrp, p.price, p.discount, p.gst,
        p.stock, p.status, p.rating
      ]);
      filename = `products_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'inventory') {
      const products = db.products.getAll();
      const incomingStock = db.incomingStock.getAll();
      const orders = db.orders.getAll();

      headers = ['SKU', 'Name', 'Category', 'Current Stock', 'Total Incoming', 'Total Sold', 'Stock Value (Rs.)', 'Status'];
      rows = products.map(p => {
        const incoming = incomingStock.filter(s => s.productId === p.id).reduce((s, e) => s + e.quantity, 0);
        const sold = orders.flatMap(o => o.items).filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
        return [p.sku, p.name, p.category, p.stock, incoming, sold, (p.stock * p.price).toFixed(2), p.status];
      });
      filename = `inventory_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'sales') {
      const orders = db.orders.getAll().filter(o => {
        const d = new Date(o.createdAt);
        return d >= fromDate && d <= toDate && !['Cancelled', 'Returned'].includes(o.status);
      });

      headers = ['Date', 'Order ID', 'Items', 'Revenue (Rs.)', 'GST (Rs.)', 'Payment Method'];
      rows = orders.map(o => [
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.id,
        o.items.length,
        o.grandTotal,
        o.gstTotal,
        o.paymentMethod
      ]);
      filename = `sales_report_${new Date().toISOString().slice(0, 10)}`;

    } else if (type === 'refunds') {
      const orders = db.orders.getAll().filter(o => o.status === 'Cancelled' || o.refundStatus);

      headers = ['Order ID', 'Date', 'Customer', 'Grand Total (Rs.)', 'Refund Amount (Rs.)', 'Refund Status', 'Reason', 'Payment Method'];
      rows = orders.map(o => [
        o.id,
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.deliveryAddress.name,
        o.grandTotal,
        o.refundAmount ?? o.grandTotal,
        o.refundStatus || 'Pending',
        o.cancellationReason || '',
        o.paymentMethod
      ]);
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
