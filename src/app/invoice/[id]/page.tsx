'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Order } from '@/db/db';
import { Printer, ArrowLeft, Download } from 'lucide-react';

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.order);
        }
      } catch (error) {
        console.error('Failed to fetch invoice', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-slate-500">
        <h2 className="text-2xl font-bold mb-2">Invoice Not Found</h2>
        <p>The requested order could not be located.</p>
        <button onClick={() => window.close()} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-semibold">Close Window</button>
      </div>
    );
  }

  const handlePrint = () => {
    const originalTitle = document.title;
    const invoiceSuffix = order.invoiceNumber || `INV-${new Date(order.createdAt).getFullYear()}-${order.id.split('-').pop()}`;
    document.title = `Invoice-${invoiceSuffix}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
      
      {/* Non-printable action bar */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center px-4 print:hidden">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 font-bold transition-all"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button 
            onClick={handlePrint} // In real app, might generate PDF. For now, print handles PDF generation.
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl shadow-md hover:bg-primary-light font-bold transition-all"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Invoice A4 Container */}
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-16 shadow-xl rounded-2xl print:shadow-none print:rounded-none print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8">
          <div>
            <h1 className="text-3xl font-black text-primary font-display tracking-tight">REDDY PREMIUM DAIRY</h1>
            <p className="text-slate-500 text-sm mt-1 font-semibold">Freshness Delivered, Pure & Natural.</p>
            <div className="mt-4 text-xs text-slate-400 font-medium leading-relaxed">
              <p>Reddy Premium Dairy Ltd.</p>
              <p>Chiyyedu Village, Anantapur District</p>
              <p>Andhra Pradesh, India - 515001</p>
              <p>GSTIN: 37AACCR1234A1Z5</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest">INVOICE</h2>
            <div className="mt-4 text-sm font-semibold text-slate-600 space-y-1">
              <p>Invoice No: <span className="text-slate-800">INV-{order.id.split('-')[1]}-{order.id.split('-')[2]}</span></p>
              <p>Date: <span className="text-slate-800">{new Date(order.createdAt).toLocaleDateString()}</span></p>
              <p>Order ID: <span className="text-slate-800">#{order.id.slice(4)}</span></p>
            </div>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-2 gap-10 py-8 border-b-2 border-slate-100">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Billed To</h3>
            <p className="font-bold text-slate-800 text-sm">{order.deliveryAddress.name}</p>
            <div className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              <p>{order.deliveryAddress.street}</p>
              <p>{order.deliveryAddress.village}, {order.deliveryAddress.district}</p>
              <p>{order.deliveryAddress.state} - {order.deliveryAddress.pincode}</p>
              <p className="mt-2">Phone: {order.deliveryAddress.phone}</p>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Details</h3>
            <div className="text-xs text-slate-500 font-medium space-y-1.5">
              <p className="flex justify-between max-w-[200px]"><span>Method:</span> <span className="font-bold text-slate-800">{order.paymentMethod}</span></p>
              <p className="flex justify-between max-w-[200px]"><span>Status:</span> <span className="font-bold text-emerald-600">{order.paymentStatus}</span></p>
              {order.deliverySlot && (
                <p className="flex justify-between max-w-[200px] mt-2 pt-2 border-t border-slate-100"><span>Slot:</span> <span className="font-bold text-slate-800">{order.deliverySlot}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="pb-3 w-12">#</th>
                <th className="pb-3">Item Description</th>
                <th className="pb-3 text-right">Qty</th>
                <th className="pb-3 text-right">Price</th>
                <th className="pb-3 text-right">GST</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 font-medium divide-y divide-slate-50">
              {order.items.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 text-slate-400">{index + 1}</td>
                  <td className="py-4">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400">SKU: {item.sku}</p>
                  </td>
                  <td className="py-4 text-right">{item.quantity}</td>
                  <td className="py-4 text-right">Rs. {item.price.toFixed(2)}</td>
                  <td className="py-4 text-right text-[10px] text-slate-400">{item.gst}%</td>
                  <td className="py-4 text-right font-bold text-slate-800">Rs. {(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations */}
        <div className="flex justify-end pt-4">
          <div className="w-64 space-y-3 text-sm font-medium text-slate-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">Rs. {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Total</span>
              <span className="font-bold text-slate-800">Rs. {order.gstTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-bold text-slate-800">Rs. {order.deliveryCharges.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-bold">- Rs. {order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100 text-lg font-black text-primary">
              <span>Grand Total</span>
              <span>Rs. {order.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t-2 border-slate-100 text-center text-[10px] font-semibold text-slate-400">
          <p>Thank you for choosing Reddy Premium Dairy for your organic milk needs.</p>
          <p>This is a computer generated invoice and requires no signature.</p>
        </div>

      </div>
    </div>
  );
}
