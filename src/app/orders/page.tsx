'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import {
  ShoppingBag, Package, Truck, CheckCircle2, Clock, MapPin,
  ArrowLeft, CreditCard, XCircle, RefreshCw
} from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { user, orders, refreshOrders, showToast } = useApp();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      showToast('Please login to view your orders', 'error');
    } else {
      refreshOrders();
    }
  }, [user, router, refreshOrders, showToast]);

  // Helper: status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Confirmed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Packed': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'Shipped': return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
      case 'Out for Delivery': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'Pending': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'Cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  // Helper: status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'Out for Delivery': return <Truck className="h-4 w-4" />;
      case 'Shipped': return <Package className="h-4 w-4" />;
      case 'Cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <PageWrapper>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-400">Please login to view your orders</p>
            <Link href="/login" className="text-xs font-bold text-accent hover:underline">
              Go to Login →
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary dark:text-white">My Orders</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
            </p>
          </div>
          <button
            onClick={refreshOrders}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-400 border rounded-xl hover:border-accent hover:text-accent transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* No Orders */}
        {orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-16 text-center shadow-sm space-y-4">
            <ShoppingBag className="h-14 w-14 text-slate-200 dark:text-slate-700 mx-auto" />
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-400">No orders yet</p>
              <p className="text-xs text-slate-400">Start shopping and your orders will appear here!</p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-accent text-slate-900 font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all mt-4"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse Products
            </Link>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-5">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order ID</p>
                      <p className="text-sm font-bold font-mono text-slate-800 dark:text-white">#{order.id}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Placed on</p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' '}at{' '}
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-5 py-4 space-y-3">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-50 dark:bg-slate-950 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white truncate max-w-xs">{item.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Qty: {item.quantity} × ₹{item.price.toFixed(2)}
                            {item.gst > 0 && <span className="ml-1 text-slate-400">(+{item.gst}% GST)</span>}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-white">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Order Footer: Totals + Payment + Delivery */}
                <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Amount Summary */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount</p>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span></div>
                        {order.gstTotal > 0 && <div className="flex justify-between"><span>GST</span><span>₹{order.gstTotal.toFixed(2)}</span></div>}
                        <div className="flex justify-between"><span>Delivery</span><span>{order.deliveryCharges > 0 ? `₹${order.deliveryCharges.toFixed(2)}` : 'Free'}</span></div>
                        {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-₹{order.discount.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-slate-800 dark:text-white text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                          <span>Total</span><span>₹{order.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payment</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{order.paymentMethod}</span>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>

                    {/* Delivery Address */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Delivery To</p>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="text-[11px] text-slate-500">
                          <p className="font-bold text-slate-700 dark:text-slate-300">{order.deliveryAddress.name}</p>
                          <p>{order.deliveryAddress.street}</p>
                          <p>{[order.deliveryAddress.village, order.deliveryAddress.district].filter(Boolean).join(', ')}</p>
                          <p>{order.deliveryAddress.state} {(order.deliveryAddress as any).pincode && `- ${(order.deliveryAddress as any).pincode}`}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Timeline (visual tracker) */}
                  {order.timeline && order.timeline.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Tracking Timeline</p>
                      <div className="flex items-center gap-0 overflow-x-auto pb-2">
                        {order.timeline.map((step: any, idx: number) => (
                          <div key={idx} className="flex items-center shrink-0">
                            <div className="flex flex-col items-center">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                step.done
                                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}>
                                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                              </div>
                              <p className={`text-[8px] font-bold mt-1 whitespace-nowrap ${step.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {step.status}
                              </p>
                              {step.done && step.time && (
                                <p className="text-[7px] text-slate-400">
                                  {new Date(step.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </p>
                              )}
                            </div>
                            {idx < order.timeline.length - 1 && (
                              <div className={`h-0.5 w-8 mx-1 rounded-full ${
                                step.done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Shop */}
        <div className="text-center pt-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Continue Shopping
          </Link>
        </div>

      </div>
    </PageWrapper>
  );
}
