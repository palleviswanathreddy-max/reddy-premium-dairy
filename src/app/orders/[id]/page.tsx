'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Order } from '@/db/db';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { 
  CheckCircle2, Package, Clock, ArrowLeft, Download,
  PhoneCall, MessageCircle, RotateCcw, AlertTriangle,
  Ban, Star, Receipt, CreditCard, ChevronRight, CalendarClock
} from 'lucide-react';
import Link from 'next/link';
import LiveOrderTracker from '@/components/LiveOrderTracker';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { products, addToCart, showToast } = useApp();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer Requested');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.order);
        }
      } catch (error) {
        console.error('Failed to fetch order', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="h-64 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
              <div className="h-48 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            </div>
            <div className="space-y-6">
              <div className="h-40 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
              <div className="h-40 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!order) {
    return (
      <PageWrapper>
        <div className="flex flex-col min-h-[60vh] items-center justify-center text-slate-500 space-y-4">
          <Package className="h-16 w-16 text-slate-200" />
          <h2 className="text-2xl font-bold font-display text-slate-800">Order Not Found</h2>
          <p className="text-sm font-semibold">We couldn&apos;t locate this order.</p>
          <button onClick={() => router.push('/orders')} className="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-bold">Back to Orders</button>
        </div>
      </PageWrapper>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/50';
      case 'confirmed': return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50';
      case 'packed': return 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/50';
      case 'shipped': 
      case 'out for delivery': return 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/50';
      case 'delivered': return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50';
      case 'cancelled': return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50';
      default: return 'text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '🟡';
      case 'confirmed': return '🔵';
      case 'packed': return '🟣';
      case 'shipped': 
      case 'out for delivery': return '🟠';
      case 'delivered': return '🟢';
      case 'cancelled': return '🔴';
      default: return '⚪';
    }
  };

  const isDelivered = order.status === 'Delivered';
  const isCancelled = order.status === 'Cancelled';
  
  // Custom timeline matching enterprise apps
  const enterpriseTimeline = [
    { label: 'Order Placed', active: true, done: true, time: order.createdAt },
    { label: 'Payment Confirmed', active: order.paymentStatus === 'Paid', done: order.paymentStatus === 'Paid', time: order.createdAt },
    { label: 'Order Accepted', active: !['Pending', 'Cancelled'].includes(order.status), done: !['Pending', 'Cancelled'].includes(order.status), time: order.timeline.find(t => t.status === 'Confirmed')?.time },
    { label: 'Preparing Fresh Milk', active: ['Packed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(order.status), done: ['Packed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(order.status), time: order.timeline.find(t => t.status === 'Packed')?.time },
    { label: 'Out For Delivery', active: ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status), done: ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.status), time: order.timeline.find(t => t.status === 'Out for Delivery')?.time },
    { label: 'Delivered', active: isDelivered, done: isDelivered, time: order.deliveredAt || order.timeline.find(t => t.status === 'Delivered')?.time },
  ];

  const handleCancelOrder = async () => {
    setIsSubmittingCancel(true);
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          status: 'Cancelled',
          cancellationReason: cancelReason,
          refundStatus: 'Completed',
          refundAmount: order.grandTotal
        })
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        showToast('Order cancelled successfully', 'success');
      } else {
        showToast(data.message || 'Failed to cancel order', 'error');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error occurred';
      showToast(message, 'error');
    } finally {
      setIsSubmittingCancel(false);
      setCancelling(false);
    }
  };

  const handleReorderAll = () => {
    let anyAdded = false;
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        addToCart(product, item.quantity);
        anyAdded = true;
      }
    });
    if (anyAdded) router.push('/checkout');
    else showToast('No items are available for reorder', 'error');
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
        
        {/* Top Header / Back */}
        <div>
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        {/* Status Header Block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Order #{order.id}</h1>
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getStatusColor(order.status)} flex items-center gap-1.5`}>
                {order.status} {getStatusDot(order.status)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-8 pt-2">
              <div>
                <p className="text-xs font-semibold text-slate-500">Placed on:</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              {order.expectedDelivery && !isDelivered && !isCancelled && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Expected Delivery:</p>
                  <p className="text-sm font-bold text-primary">{new Date(order.expectedDelivery).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
              {isDelivered && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Delivered at:</p>
                  <p className="text-sm font-bold text-green-600">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="shrink-0 flex items-center gap-3">
             <button onClick={() => window.open(`/invoice/${order.id}`, '_blank')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
               <Download className="h-4 w-4" /> Invoice
             </button>
          </div>
        </div>

        {isCancelled && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-3xl p-6 shadow-sm space-y-4">
             <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
               <Ban className="h-6 w-6" />
               <h3 className="text-lg font-black">Order Cancelled</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-red-100 dark:border-red-900/30">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Reason</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{order.cancellationReason || 'Customer Requested'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Refund Status</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{order.refundStatus || 'Completed'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Refund Amount</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">₹{(order.refundAmount || order.grandTotal).toFixed(2)}</p>
                </div>
             </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Main Content Column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Timeline */}
            {!isCancelled && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <h2 className="text-base font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Order Timeline
                </h2>
                
                <div className="relative pl-2">
                  <div className="absolute left-4 top-2 bottom-6 w-0.5 bg-slate-100 dark:bg-slate-800"></div>
                  <div className="space-y-6">
                    {enterpriseTimeline.map((step, idx) => {
                      if (!step.active && !step.done) return null; // hide future steps if not active? Actually show them as faded.
                      
                      const isCurrent = step.done && (!enterpriseTimeline[idx + 1] || !enterpriseTimeline[idx + 1].done);
                      const isCompleted = step.done && !isCurrent;
                      const isPending = !step.done;

                      return (
                        <div key={idx} className="relative flex items-start gap-4">
                          <div className={`h-5 w-5 rounded-full mt-0.5 flex items-center justify-center shrink-0 z-10 
                            ${isCurrent ? 'bg-primary ring-4 ring-primary/20' : isCompleted ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            {isCompleted ? <CheckCircle2 className="h-3 w-3 text-white" /> : <div className="h-2 w-2 bg-white rounded-full"></div>}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isPending ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {step.label}
                            </p>
                            {step.time && step.done && (
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {new Date(step.time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Live Order Tracking */}
            {(order.status === 'Out for Delivery' || order.status === 'Delivered') && order.deliveryPartner && (
              <LiveOrderTracker partner={order.deliveryPartner} />
            )}

            {/* Ordered Products */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Ordered Products
                </h2>
                <span className="text-xs font-bold bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">{order.items.length} items</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.items.map((item, idx) => {
                  const productInDb = products.find(p => p.id === item.productId);
                  const imageSrc = productInDb?.images[0] || "/images/interface image.png";
                  // Attempt to extract variant from SKU or name, or default
                  const variant = productInDb?.variants?.find(v => item.sku.includes(v.id))?.label || productInDb?.volume || productInDb?.weight || 'Standard';

                  return (
                    <div key={idx} className="p-6 flex flex-col sm:flex-row gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Image */}
                      <div className="h-20 w-20 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageSrc} alt={item.name} className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</h3>
                            <p className="text-xs font-semibold text-slate-500 mt-1">{variant}</p>
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white text-right">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-end pt-2">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg inline-block">
                            Qty: {item.quantity} × ₹{item.price.toFixed(2)}
                          </p>
                          {isDelivered && (
                            <button className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors">
                              <Star className="h-3.5 w-3.5 fill-current" /> Write Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Address, Payment, Actions */}
          <div className="space-y-6">
            
            {/* Delivery Address */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Delivery Address</h3>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{order.deliveryAddress.name}</p>
                <p className="text-xs font-semibold text-slate-500 mb-2">{order.deliveryAddress.phone}</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  {order.deliveryAddress.street}, {order.deliveryAddress.village && `${order.deliveryAddress.village}, `}
                  {order.deliveryAddress.district}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                </p>
              </div>
              <button disabled className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed">
                Change Address (Disabled)
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
               <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">Order Summary</h3>
               <div className="space-y-3 text-sm font-medium">
                 <div className="flex justify-between text-slate-600 dark:text-slate-400">
                   <span>Subtotal</span>
                   <span className="font-bold text-slate-900 dark:text-white">₹{order.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-slate-600 dark:text-slate-400">
                   <span>Delivery Charge</span>
                   <span className="font-bold text-slate-900 dark:text-white">₹{order.deliveryCharges.toFixed(2)}</span>
                 </div>
                 {order.discount > 0 && (
                   <div className="flex justify-between text-emerald-600">
                     <span>Coupon Discount</span>
                     <span className="font-bold">-₹{order.discount.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="flex justify-between text-slate-600 dark:text-slate-400">
                   <span>GST</span>
                   <span className="font-bold text-slate-900 dark:text-white">₹{order.gstTotal.toFixed(2)}</span>
                 </div>
                 <div className="pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between">
                   <span className="font-black text-slate-900 dark:text-white">Total Paid</span>
                   <span className="font-black text-primary text-base">₹{order.grandTotal.toFixed(2)}</span>
                 </div>
               </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
               <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">Payment Details</h3>
               <div className="space-y-3">
                 <div className="flex justify-between items-center text-xs">
                   <span className="font-semibold text-slate-500">Payment Method</span>
                   <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-slate-400" /> {order.paymentMethod}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="font-semibold text-slate-500">Payment Status</span>
                   <span className={`font-bold px-2 py-0.5 rounded-md ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'}`}>{order.paymentStatus}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="font-semibold text-slate-500">Transaction ID</span>
                   <span className="font-bold text-slate-900 dark:text-white">{order.id.replace('ORD-', 'TXN')}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="font-semibold text-slate-500">Invoice Number</span>
                   <span className="font-bold text-slate-900 dark:text-white">{order.invoiceNumber || `INV-${order.id}`}</span>
                 </div>
               </div>
            </div>

            {/* Subscription Info */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-6 rounded-3xl shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                   <CalendarClock className="h-5 w-5 text-primary" />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 dark:text-white">Subscription Info</h3>
               </div>
               <p className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-11">
                 {order.subscriptionType || 'One Time Order'}
               </p>
               {order.subscriptionType === 'Daily Subscription' && (
                 <p className="text-xs font-semibold text-slate-500 ml-11 mt-1">Morning Delivery - 6:00 AM</p>
               )}
            </div>

            {/* Need Help & Actions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
               <h3 className="text-sm font-black text-slate-900 dark:text-white">Need Help?</h3>
               <div className="grid grid-cols-2 gap-3">
                 <a href="tel:18001234567" className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                   <PhoneCall className="h-3.5 w-3.5" /> Call Support
                 </a>
                 <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl text-xs font-bold text-[#20bd5a] transition-colors">
                   <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                 </a>
                 <button className="col-span-2 flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                   <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Report Missing Items</span>
                   <ChevronRight className="h-4 w-4 text-slate-400" />
                 </button>
               </div>

               <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                 <button onClick={handleReorderAll} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors shadow-sm">
                   <RotateCcw className="h-4 w-4" /> Reorder Entire Order
                 </button>
                 <button onClick={() => window.open(`/invoice/${order.id}`, '_blank')} className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                   <Receipt className="h-4 w-4" /> Download Bill (PDF)
                 </button>

                 {/* Cancel Order Section */}
                 {!isCancelled && !isDelivered && ['Pending', 'Confirmed', 'Packed'].includes(order.status) && (
                   <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                     {!cancelling ? (
                       <button 
                         onClick={() => setCancelling(true)} 
                         className="w-full py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                       >
                         <Ban className="h-4 w-4" /> Cancel Order
                       </button>
                     ) : (
                       <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 space-y-3">
                         <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Select reason for cancellation:</p>
                         <select 
                           value={cancelReason} 
                           onChange={(e) => setCancelReason(e.target.value)}
                           className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 font-bold"
                         >
                           <option value="Customer Requested">Customer Requested</option>
                           <option value="Incorrect Address">Incorrect Address</option>
                           <option value="Ordered by Mistake">Ordered by Mistake</option>
                           <option value="Delayed Delivery">Delayed Delivery</option>
                         </select>
                         <div className="flex gap-2 pt-1">
                           <button 
                             onClick={handleCancelOrder} 
                             disabled={isSubmittingCancel}
                             className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center"
                           >
                             {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancel'}
                           </button>
                           <button 
                             onClick={() => setCancelling(false)} 
                             disabled={isSubmittingCancel}
                             className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                           >
                             Keep Order
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
            </div>

          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
