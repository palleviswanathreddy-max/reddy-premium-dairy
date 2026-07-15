'use client';

import React, { useEffect, useState } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { 
  Package, MapPin, PhoneCall, CheckCircle2, 
  Clock, CheckSquare, RefreshCw, AlertCircle
} from 'lucide-react';
import { Order } from '@/db/db';

export default function DeliveryPortal() {
  const { showToast, user } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch delivery orders', error);
      showToast('Failed to load delivery assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // delay state update to avoid set-state-in-effect warning
    Promise.resolve().then(() => fetchOrders());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (orderId: string, action: string) => {
    try {
      const res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action })
      });
      const data = await res.json();
      
      if (data.success) {
        showToast(`Order marked as ${action === 'MARK_DELIVERED' ? 'Delivered' : 'Out for Delivery'}`, 'success');
        fetchOrders();
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    }
  };

  if (user?.role === 'customer') {
    return (
      <PageWrapper>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-2xl font-bold font-display text-slate-800">Access Denied</h2>
          <p className="text-sm font-semibold text-slate-500">You must be logged in as a Delivery Executive to view this portal.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-20">
        
        {/* Header (Mobile First) */}
        <div className="bg-primary text-white p-6 rounded-b-[2rem] shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Package className="h-32 w-32" />
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-1">Delivery Portal</p>
              <h1 className="text-2xl font-black font-display tracking-wide">Today&apos;s Routes</h1>
            </div>
            <button onClick={fetchOrders} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-colors">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
              <p className="text-3xl font-black">{orders.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 mt-1">Pending Drops</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
              <p className="text-3xl font-black">
                {orders.filter(o => o.paymentMethod === 'COD').length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 mt-1">Cash Collects</p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="px-4 py-6 space-y-4">
          {loading && orders.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 space-y-3 opacity-60">
              <CheckCircle2 className="h-12 w-12 mx-auto" />
              <p className="text-sm font-bold">All caught up!</p>
              <p className="text-xs">No pending deliveries right now.</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                
                {/* Status & ID */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Order ID</span>
                    <span className="text-sm font-black font-mono text-slate-800">#{order.id.slice(4)}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    order.status === 'Out for Delivery' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status}
                  </span>
                </div>

                {/* Delivery Address & Contact */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div className="text-xs font-semibold text-slate-500">
                      <p className="font-bold text-slate-800 text-sm mb-1">{order.deliveryAddress.name}</p>
                      <p>{order.deliveryAddress.street}, {order.deliveryAddress.village}</p>
                      <p>{order.deliveryAddress.district}, {order.deliveryAddress.pincode}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-2">
                    <PhoneCall className="h-4 w-4 text-emerald-500 shrink-0" />
                    <a href={`tel:${order.deliveryAddress.phone}`} className="text-xs font-bold text-emerald-600 hover:underline">
                      {order.deliveryAddress.phone}
                    </a>
                  </div>
                </div>

                {/* Payment & Items Info */}
                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{order.items.length} items</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{order.deliverySlot}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary text-sm">₹{order.grandTotal.toFixed(2)}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                      order.paymentMethod === 'COD' ? 'text-amber-600' : 'text-emerald-500'
                    }`}>
                      {order.paymentMethod} • {order.paymentStatus}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {order.status !== 'Out for Delivery' ? (
                    <button 
                      onClick={() => handleAction(order.id, 'MARK_OUT_FOR_DELIVERY')}
                      className="col-span-2 py-3.5 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                    >
                      <Clock className="h-4 w-4" /> Start Delivery
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAction(order.id, 'MARK_DELIVERED')}
                      className="col-span-2 py-3.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/30 flex items-center justify-center gap-2 hover:bg-primary-light transition-colors"
                    >
                      <CheckSquare className="h-4 w-4" /> Mark as Delivered
                    </button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
