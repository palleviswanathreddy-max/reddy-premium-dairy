'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { 
  User as UserIcon, ShoppingBag, MapPin, Heart, Wallet, Gift, 
  Map, FileText, ChevronRight, CheckCircle2, Truck, Plus, Trash2, Camera, LogOut, X 
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    user, 
    orders, 
    wishlist, 
    products, 
    updateUserAvatar, 
    addAddress, 
    removeAddress, 
    logout,
    showToast,
    t 
  } = useApp();

  const [activeTab, setActiveTab] = useState('orders');
  
  // Address Form State
  const [addressName, setAddressName] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressVillage, setAddressVillage] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressState, setAddressState] = useState('Andhra Pradesh');
  const [addressPincode, setAddressPincode] = useState('');
  const [addressDefault, setAddressDefault] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Live Tracking Modal State
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const [trackingStep, setTrackingStep] = useState(0);

  // Sync tab from URL query param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Sync simulated map coordinates tracking
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (trackingOrder) {
      timer = setInterval(() => {
        setTrackingStep(prev => (prev >= 100 ? 0 : prev + 5));
      }, 800);
    }
    return () => clearInterval(timer);
  }, [trackingOrder]);

  if (!user) return null;

  // Handle Avatar upload (Base64)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          updateUserAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit address form
  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressName || !addressPhone || !addressStreet || !addressPincode) return;

    const res = await addAddress({
      name: addressName,
      phone: addressPhone,
      street: addressStreet,
      village: addressVillage || 'Chiyyedu',
      district: addressDistrict || 'Anantapur',
      state: addressState,
      pincode: addressPincode,
      isDefault: addressDefault
    });

    if (res) {
      setAddressName('');
      setAddressPhone('');
      setAddressStreet('');
      setAddressVillage('');
      setAddressDistrict('');
      setAddressPincode('');
      setAddressDefault(false);
      setShowAddressForm(false);
    }
  };

  // Download Invoice HTML simulation
  const downloadInvoice = (order: any) => {
    const invoiceHTML = `
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0B2545; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 24px; font-weight: bold; color: #0B2545; }
            .meta { text-align: right; font-size: 12px; }
            .details { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; font-size: 13px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th, .table td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; font-size: 13px; }
            .table th { background: #EEF4F8; color: #0B2545; }
            .totals { float: right; width: 300px; font-size: 13px; }
            .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
            .grand { font-size: 16px; font-weight: bold; border-top: 2px double #0B2545; padding-top: 10px; color: #0B2545; }
            .footer { margin-top: 100px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; text-align: center; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">REDDY PREMIUM DAIRY</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Chiyyedu, Anantapur District, AP – 515721</div>
            </div>
            <div class="meta">
              <h2>TAX INVOICE</h2>
              <p><strong>Invoice No:</strong> ${order.id}<br /><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div class="details">
            <div>
              <strong>Billed To:</strong><br />
              ${order.deliveryAddress.name}<br />
              ${order.deliveryAddress.street}, ${order.deliveryAddress.village}<br />
              District: ${order.deliveryAddress.district}, Pincode: ${order.deliveryAddress.pincode}<br />
              Phone: ${order.deliveryAddress.phone}
            </div>
            <div style="text-align: right;">
              <strong>Payment Status:</strong> ${order.paymentStatus}<br />
              <strong>Payment Method:</strong> ${order.paymentMethod}<br />
              <strong>Delivery Status:</strong> ${order.status}
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Rate (Rs.)</th>
                <th>GST %</th>
                <th>Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.sku}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>${item.gst}%</td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal:</span> <span>Rs. ${order.subtotal.toFixed(2)}</span></div>
            <div><span>GST Tax:</span> <span>Rs. ${order.gstTotal.toFixed(2)}</span></div>
            <div><span>Delivery Charges:</span> <span>Rs. ${order.deliveryCharges.toFixed(2)}</span></div>
            ${order.discount > 0 ? `<div><span>Discount Applied:</span> <span style="color: green;">- Rs. ${order.discount.toFixed(2)}</span></div>` : ''}
            <div class="grand"><span>Grand Total:</span> <span>Rs. ${order.grandTotal.toFixed(2)}</span></div>
          </div>
          <div style="clear: both;"></div>
          <div class="footer">
            Thank you for buying organic at Reddy Premium Dairy. This is a computer generated invoice and requires no signature.<br />
            For support, contact +91 6300928511 or palleviswanathreddy11@gmail.com.
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice-${order.id}.html`;
    link.click();
    showToast("Invoice downloaded successfully!", "success");
  };

  // Find wishlist products
  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* User Information Card */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-6 text-center">
              
              {/* Profile image with camera upload */}
              <div className="relative mx-auto w-24 h-24 group">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover border-4 border-slate-100 dark:border-slate-800" />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary text-white text-3xl font-extrabold flex items-center justify-center uppercase">
                    {user.name.charAt(0)}
                  </div>
                )}
                
                {/* Upload overlay hover */}
                <label className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-5 w-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              {/* Bio details */}
              <div className="space-y-1">
                <h2 className="text-base font-bold font-display text-slate-800 dark:text-white truncate">{user.name}</h2>
                <p className="text-[10px] font-bold text-secondary dark:text-accent uppercase tracking-widest leading-none mt-0.5">{user.role}</p>
                <p className="text-xs text-slate-400 font-semibold">{user.email}</p>
                <p className="text-xs text-slate-400 font-semibold">{user.phone}</p>
              </div>

              {/* Loyalty balances */}
              <div className="grid grid-cols-2 gap-4 p-4 border border-slate-50 dark:border-slate-950 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl">
                <div className="flex flex-col items-center justify-center">
                  <Wallet className="h-5 w-5 text-accent mb-1" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Wallet Balance</p>
                  <p className="text-sm font-extrabold text-primary dark:text-accent mt-0.5">Rs. {user.walletBalance}</p>
                </div>
                <div className="flex flex-col items-center justify-center border-l border-slate-200 dark:border-slate-800">
                  <Gift className="h-5 w-5 text-secondary mb-1" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reward Points</p>
                  <p className="text-sm font-extrabold text-primary dark:text-accent mt-0.5">{user.rewardPoints} pts</p>
                </div>
              </div>

              {/* Tab options lists */}
              <div className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                {[
                  { id: 'orders', label: 'Order History', icon: <ShoppingBag className="h-4 w-4" /> },
                  { id: 'addresses', label: 'Address Book', icon: <MapPin className="h-4 w-4" /> },
                  { id: 'wishlist', label: 'My Wishlist', icon: <Heart className="h-4 w-4" /> },
                  { id: 'referral', label: 'Refer & Earn', icon: <Gift className="h-4 w-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${
                      activeTab === tab.id 
                        ? 'bg-primary/10 text-primary dark:text-accent font-bold shadow-inner' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}

                <button 
                  onClick={() => { logout(); router.push('/'); }}
                  className="flex items-center gap-2.5 px-4 py-3.5 text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>

            </div>
          </div>

          {/* Tab Content Panels */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md">
            
            {/* 1. ORDER HISTORY TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <h3 className="text-base font-bold font-display text-primary dark:text-white border-b pb-3.5">
                  Your Order Logs
                </h3>

                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                    <ShoppingBag className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-bold text-slate-500">You haven't ordered any fresh milk products yet.</p>
                    <Link href="/products" className="px-4 py-2 bg-accent text-slate-900 text-xs font-bold rounded-lg mt-2">
                      Shop Fresh Dairy
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div 
                        key={order.id}
                        className="p-5 border border-slate-100 dark:border-slate-900 rounded-2xl bg-slate-50/30 dark:bg-slate-900/30 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-900 pb-3 text-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">Order: #{order.id.slice(4)}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-full tracking-wider ${
                              order.status === 'Delivered' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}>
                              {order.status}
                            </span>
                            <span className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-full tracking-wider ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-secondary/10 text-secondary dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>

                        {/* Order items lists */}
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                              <p className="text-slate-700 dark:text-slate-300">
                                {item.name} <span className="text-slate-400">x {item.quantity}</span>
                              </p>
                              <span className="text-slate-900 dark:text-white font-bold">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Order timeline summary & total */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-900 text-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            Total: <span className="text-primary dark:text-accent font-display text-sm font-extrabold">Rs. {order.grandTotal.toFixed(2)}</span>
                          </p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => downloadInvoice(order)}
                              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 rounded-lg flex items-center gap-1 font-semibold text-[10px] uppercase"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Invoice</span>
                            </button>
                            
                            {/* Live Tracking map launcher */}
                            {(order.status === 'Shipped' || order.status === 'Out for Delivery') && (
                              <button 
                                onClick={() => { setTrackingOrder(order); setTrackingStep(0); }}
                                className="px-3 py-1.5 bg-secondary text-white rounded-lg flex items-center gap-1 font-semibold text-[10px] uppercase"
                              >
                                <Map className="h-3.5 w-3.5" />
                                <span>Track Live</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. ADDRESS BOOK TAB */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-3.5 mb-2">
                  <h3 className="text-base font-bold font-display text-primary dark:text-white">
                    Manage Addresses
                  </h3>
                  <button 
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-accent"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Address</span>
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddAddressSubmit} className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold space-y-4 animate-splash">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Name</label>
                        <input
                          type="text"
                          required
                          value={addressName}
                          onChange={(e) => setAddressName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border rounded-xl px-3.5 py-2.5 outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</label>
                        <input
                          type="tel"
                          required
                          value={addressPhone}
                          onChange={(e) => setAddressPhone(e.target.value)}
                          className="w-full bg-white dark:bg-slate-955 border rounded-xl px-3.5 py-2.5 outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Street Address / House No</label>
                      <input
                        type="text"
                        required
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        className="w-full bg-white dark:bg-slate-955 border rounded-xl px-3.5 py-2.5 outline-none focus:border-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Village / Town</label>
                        <input
                          type="text"
                          value={addressVillage}
                          onChange={(e) => setAddressVillage(e.target.value)}
                          className="w-full bg-white dark:bg-slate-955 border rounded-xl px-3.5 py-2.5 outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">District</label>
                        <input
                          type="text"
                          value={addressDistrict}
                          onChange={(e) => setAddressDistrict(e.target.value)}
                          className="w-full bg-white dark:bg-slate-955 border rounded-xl px-3.5 py-2.5 outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PIN Code</label>
                        <input
                          type="text"
                          required
                          value={addressPincode}
                          onChange={(e) => setAddressPincode(e.target.value)}
                          className="w-full bg-white dark:bg-slate-955 border rounded-xl px-3.5 py-2.5 outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State</label>
                        <input
                          type="text"
                          value={addressState}
                          onChange={(e) => setAddressState(e.target.value)}
                          className="w-full bg-white dark:bg-slate-955 border rounded-xl px-3.5 py-2.5 outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="addrDefault" 
                        checked={addressDefault}
                        onChange={(e) => setAddressDefault(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-350 focus:ring-accent" 
                      />
                      <label htmlFor="addrDefault" className="text-slate-500 font-bold select-none cursor-pointer">Set as default address</label>
                    </div>

                    <div className="flex gap-2.5 pt-4">
                      <button 
                        type="submit"
                        className="flex-1 py-3 bg-secondary text-white font-bold rounded-xl shadow-md"
                      >
                        Save Address
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {user.addresses.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold">No addresses added. Create one above to speed up checkout.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.addresses.map((addr) => (
                      <div 
                        key={addr.id}
                        className={`p-4 border rounded-2xl space-y-2.5 relative flex flex-col justify-between ${
                          addr.isDefault 
                            ? 'border-accent bg-accent/5 dark:bg-slate-950/20' 
                            : 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pr-8">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{addr.name}</p>
                            {addr.isDefault && (
                              <span className="text-[8px] bg-accent/25 text-primary dark:text-accent font-extrabold uppercase px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                            {addr.street}, {addr.village}, District: {addr.district}, PIN: {addr.pincode}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Phone: {addr.phone}</p>
                        </div>
                        <button 
                          onClick={() => removeAddress(addr.id)}
                          className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-slate-100 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <div className="space-y-6">
                <h3 className="text-base font-bold font-display text-primary dark:text-white border-b pb-3.5">
                  My Starred Products
                </h3>

                {wishlistProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold">Your wishlist is empty. Explore our catalog to star items.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {wishlistProducts.map(prod => (
                      <div key={prod.id} className="border rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-900/40 relative flex flex-col justify-between">
                        <img src={prod.images[0]} alt="" className="aspect-square object-cover rounded-xl border bg-white w-full mb-2" />
                        <Link href={`/products/${prod.id}`}>
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate hover:underline hover:text-primary">{prod.name}</p>
                        </Link>
                        <p className="text-[9px] text-slate-400 font-semibold">{prod.weight} • Rs. {prod.price}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. REFERRAL TAB */}
            {activeTab === 'referral' && (
              <div className="space-y-6 text-left">
                <h3 className="text-base font-bold font-display text-primary dark:text-white border-b pb-3.5">
                  Refer & Earn Rewards
                </h3>
                
                <div className="p-6 bg-secondary/5 rounded-3xl border border-secondary/15 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-secondary/10 rounded-full text-secondary dark:text-accent">
                    <Gift className="h-10 w-10" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Earn Rs. 50 on every referral!</h4>
                  <p className="text-xs text-slate-400 max-w-sm font-semibold">
                    Share your unique referral code with family and friends. When they place their first order, they get Rs. 20 off, and you receive Rs. 50 in your wallet instantly!
                  </p>
                  
                  <div className="flex w-full max-w-xs gap-2 pt-2">
                    <input 
                      type="text" 
                      readOnly
                      value="REDDY-COW-A2" 
                      className="bg-white dark:bg-slate-950 border px-4 py-2.5 rounded-xl font-bold tracking-widest text-center text-xs select-all outline-none flex-grow"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("REDDY-COW-A2");
                        showToast("Referral code copied!", "success");
                      }}
                      className="px-4 py-2.5 bg-accent text-slate-900 font-bold text-xs rounded-xl shadow-md"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* 5. Live Tracking Map Modal simulation */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 w-full max-w-lg space-y-5 text-left"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-primary dark:text-white">Live Delivery Tracking</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Order: #{trackingOrder.id.slice(4)}</p>
              </div>
              <button 
                onClick={() => setTrackingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Simulated Map Coordinates Grid */}
            <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              
              {/* Map grid lines */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-15 pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border border-slate-400" />
                ))}
              </div>

              {/* Farm Marker */}
              <div className="absolute top-8 left-8 flex flex-col items-center">
                <span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary">
                  🏠
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Farm</span>
              </div>

              {/* Delivery Path line */}
              <div className="absolute top-11 left-11 right-11 h-0.5 bg-dashed bg-slate-400/50" />

              {/* Moving Vehicle */}
              <div 
                className="absolute top-8 flex flex-col items-center transition-all duration-300"
                style={{ left: `calc(10% + ${trackingStep}%)` }}
              >
                <div className="h-7 w-7 rounded-full bg-accent text-slate-900 shadow-lg flex items-center justify-center text-xs animate-bounce">
                  🚚
                </div>
                <span className="text-[8px] bg-slate-900 text-white font-extrabold uppercase px-1 rounded shadow mt-1">Reddy Express</span>
              </div>

              {/* Destination Customer Marker */}
              <div className="absolute top-8 right-8 flex flex-col items-center">
                <span className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center ring-2 ring-secondary">
                  📍
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Home</span>
              </div>

              <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded-xl border text-[9px] font-bold text-slate-500 uppercase">
                Anantapur highway route
              </div>
            </div>

            {/* Tracking Status details */}
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-secondary/15 rounded-xl text-secondary dark:text-accent">
                <Truck className="h-6 w-6" />
              </div>
              <div className="flex-grow space-y-1 text-xs">
                <p className="font-bold text-slate-800 dark:text-white">Out for Delivery</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Delivery executive is passing Chiyyedu Junction. ETA: <strong>12 mins</strong>
                </p>
              </div>
            </div>

            {/* Detailed order step timeline list */}
            <div className="border-t border-slate-100 dark:border-slate-900 pt-4 space-y-2.5">
              {trackingOrder.timeline.map((step: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 text-xs font-semibold">
                  <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center ${
                    step.done 
                      ? 'bg-emerald-500 text-white text-[9px] font-extrabold' 
                      : 'border-2 border-slate-200 dark:border-slate-800 text-slate-300'
                  }`}>
                    {step.done ? '✓' : ''}
                  </div>
                  <div className="flex-grow text-left">
                    <p className={`text-[11px] ${step.done ? 'text-slate-850 dark:text-slate-200 font-bold' : 'text-slate-400'}`}>{step.status}</p>
                    {step.time && (
                      <p className="text-[9px] text-slate-450 mt-0.5">{new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        </div>
      )}

    </PageWrapper>
  );
}

export default function Profile() {
  return (
    <React.Suspense fallback={<div className="text-center py-20 text-xs font-semibold text-slate-400">Loading profile...</div>}>
      <ProfileContent />
    </React.Suspense>
  );
}
