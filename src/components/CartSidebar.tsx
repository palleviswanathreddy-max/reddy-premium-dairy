'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { X, Trash2, Plus, Minus, Ticket, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const router = useRouter();
  const { 
    cart, 
    updateCartQty, 
    removeFromCart, 
    appliedCoupon, 
    applyCouponCode, 
    removeCoupon, 
    t 
  } = useApp();

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  if (!isOpen) return null;

  // Calculators
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  // Calculate dynamic GST totals
  const gstTotal = cart.reduce((acc, item) => {
    const itemSubtotal = item.product.price * item.quantity;
    const gstValue = itemSubtotal * (item.product.gst / 100);
    return acc + gstValue;
  }, 0);

  // Delivery Charges: Rs. 20 if subtotal < 150 (unless coupon overrides it)
  let deliveryCharges = subtotal > 0 && subtotal < 150 ? 20 : 0;

  // Coupon Discount
  let discountAmount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.minPurchase) {
    if (appliedCoupon.type === 'flat') {
      discountAmount = appliedCoupon.value;
    } else if (appliedCoupon.type === 'percentage') {
      discountAmount = subtotal * (appliedCoupon.value / 100);
    } else if (appliedCoupon.type === 'free_shipping') {
      deliveryCharges = 0;
      discountAmount = 0; // Free shipping is handled in deliveryCharges
    }
  }

  const grandTotal = Math.max(0, subtotal + gstTotal + deliveryCharges - discountAmount);

  // Handle Coupon Submit
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    
    const res = await applyCouponCode(couponCode.trim());
    setCouponLoading(false);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCode('');
    }
  };

  const handleCheckoutClick = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-screen max-w-md bg-white dark:bg-slate-950 shadow-2xl flex flex-col h-full"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary dark:text-white font-display flex items-center gap-2">
              <span>{t('cart')}</span>
              <span className="text-xs bg-accent/20 text-primary dark:text-accent font-semibold px-2 py-0.5 rounded-full">
                {cart.length} Products
              </span>
            </h2>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                  <Sparkles className="h-10 w-10 animate-bounce" />
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Your cart is empty</p>
                <p className="text-xs text-slate-400">Fill it with fresh, organic products today!</p>
                <button 
                  onClick={() => { onClose(); router.push('/products'); }}
                  className="px-5 py-2.5 bg-primary text-white dark:bg-slate-900 hover:bg-primary-light text-xs font-bold rounded-full transition-all shadow-md"
                >
                  Shop Now
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.product.id}
                  className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-200/80 dark:hover:border-slate-800 transition-all"
                >
                  {/* Image */}
                  <img 
                    src={item.product.images[0] || '/images/interface image.png'} 
                    alt={item.product.name} 
                    className="h-16 w-16 object-contain rounded-xl border border-slate-200/50 dark:border-slate-800 bg-white p-0.5"
                  />
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                      {item.product.weight} • SKU: {item.product.sku.split('-')[1]}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold text-primary dark:text-accent">
                        Rs. {item.product.price}
                      </span>
                      {item.product.price < item.product.mrp && (
                        <span className="text-[10px] text-slate-400 line-through">
                          Rs. {item.product.mrp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end justify-between h-full gap-2">
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Calculations */}
          {cart.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-900 p-6 bg-slate-50/50 dark:bg-slate-950/50 space-y-4">
              
              {/* Coupon Form */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-secondary/20 bg-secondary/5 text-secondary dark:text-emerald-400">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold uppercase tracking-wider">{appliedCoupon.code}</p>
                      <p className="text-[9px] font-semibold text-slate-400">{appliedCoupon.description}</p>
                    </div>
                  </div>
                  <button 
                    onClick={removeCoupon}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t('enterCoupon')}
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="w-full bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-accent"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={couponLoading}
                      className="px-4 py-2.5 bg-primary text-white dark:bg-slate-900 text-xs font-bold rounded-xl hover:bg-primary-light transition-all shadow-sm"
                    >
                      {couponLoading ? '...' : t('applyCoupon')}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[10px] font-bold text-red-500 px-1">{couponError}</p>
                  )}
                </form>
              )}

              {/* Calculations Block */}
              <div className="space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900 pb-3">
                <div className="flex justify-between">
                  <span>{t('subtotal')}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('gst')}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">Rs. {gstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('shipping')}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {deliveryCharges === 0 ? 'FREE' : `Rs. ${deliveryCharges.toFixed(2)}`}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-secondary dark:text-emerald-400">
                    <span>{t('discount')}</span>
                    <span className="font-bold">- Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('grandTotal')}</span>
                <span className="text-xl font-bold text-primary dark:text-accent font-display">
                  Rs. {grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleCheckoutClick}
                className="w-full py-4 bg-accent text-slate-900 hover:bg-accent-light text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <span>{t('checkout')}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
