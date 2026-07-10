'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { 
  Users, ShoppingBag, DollarSign, Package, TrendingUp, AlertTriangle,
  Plus, Edit2, Trash2, Download, Check, X, ShieldAlert, BarChart3, Settings,
  CreditCard, Truck, FileBarChart, IndianRupee, Clock, CheckCircle2,
  XCircle, AlertCircle, MapPin, Calendar, ArrowUpRight, ArrowDownRight,
  Wallet, Receipt, PieChart, Activity
} from 'lucide-react';
import { Product, Order } from '@/db/db';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, products, refreshProducts, updateOrderStatus, showToast, t } = useApp();

  const [activeTab, setActiveTab] = useState('overview');
  
  // Stats state
  const [stats, setStats] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  
  // Product CRUD states
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form state
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Fresh Milk');
  const [prodSKU, setProdSKU] = useState('');
  const [prodMRP, setProdMRP] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodWeight, setProdWeight] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodIngredients, setProdIngredients] = useState('');
  const [prodStorage, setProdStorage] = useState('');

  // Payment filter
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  // Delivery filter
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  // Reports period
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    // Role protection
    if (!user || user.role !== 'admin') {
      router.push('/');
      showToast("Access Denied: Admin role required", "error");
    } else {
      fetchAdminStats();
      fetchAdminOrders();
      fetchAdminCustomers();
    }
  }, [user, router]);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      const res = await fetch('/api/orders?role=admin');
      const data = await res.json();
      if (data.success) {
        setOrdersList(data.orders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (data.success) {
        setCustomersList(data.customers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Product CRUD form
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodSKU || !prodPrice || !prodStock) return;

    const payload = {
      name: prodName,
      category: prodCategory,
      sku: prodSKU,
      brand: "REDDY PREMIUM DAIRY",
      mrp: Number(prodMRP || prodPrice),
      price: Number(prodPrice),
      discount: Math.round(((Number(prodMRP || prodPrice) - Number(prodPrice)) / Number(prodMRP || prodPrice)) * 100) || 0,
      stock: Number(prodStock),
      weight: prodWeight || "500 ml",
      volume: prodWeight || "500 ml",
      description: prodDescription,
      ingredients: prodIngredients || "Pure organic ingredients",
      storage: prodStorage || "Keep refrigerated below 4°C",
      nutrition: {
        calories: "62 kcal",
        fat: "3.2g",
        protein: "3.0g",
        carbohydrates: "4.5g"
      },
      images: ["/images/interface image.png"],
      tags: [prodCategory, "Fresh", "Healthy"],
      gst: prodCategory === 'Ghee' ? 12 : ['Butter', 'Cheese', 'Paneer', 'Curd', 'Milkshake'].includes(prodCategory) ? 5 : 0,
      expiryDays: prodCategory === 'Ghee' ? 180 : ['Butter', 'Cheese', 'Paneer'].includes(prodCategory) ? 30 : 3,
      deliveryTime: ['Fresh Milk', 'Curd'].includes(prodCategory) ? "6:00 AM - 9:00 AM Tomorrow" : "Same Day (Within 3 Hours)",
      status: Number(prodStock) > 0 ? "Available" : "Out of Stock"
    };

    try {
      let res;
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        showToast(editingProduct ? "Product updated successfully!" : "Product added successfully!", "success");
        setIsAddingProduct(false);
        setEditingProduct(null);
        clearProductForm();
        refreshProducts();
        fetchAdminStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdSKU(prod.sku);
    setProdMRP(String(prod.mrp));
    setProdPrice(String(prod.price));
    setProdStock(String(prod.stock));
    setProdWeight(prod.weight);
    setProdDescription(prod.description);
    setProdIngredients(prod.ingredients);
    setProdStorage(prod.storage);
    setIsAddingProduct(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast("Product deleted successfully!", "info");
        refreshProducts();
        fetchAdminStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearProductForm = () => {
    setProdName('');
    setProdCategory('Fresh Milk');
    setProdSKU('');
    setProdMRP('');
    setProdPrice('');
    setProdStock('');
    setProdWeight('');
    setProdDescription('');
    setProdIngredients('');
    setProdStorage('');
  };

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    const success = await updateOrderStatus(orderId, nextStatus);
    if (success) {
      fetchAdminOrders();
      fetchAdminStats();
    }
  };

  const handlePaymentStatusChange = async (orderId: string, newPaymentStatus: string) => {
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentStatus: newPaymentStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Payment marked as ${newPaymentStatus}`, 'success');
        fetchAdminOrders();
        fetchAdminStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Report Exporter
  const exportToCSV = (dataType: 'products' | 'orders' | 'customers' | 'payments' | 'delivery') => {
    let headers = '';
    let rows: any[] = [];
    let fileName = '';

    if (dataType === 'products') {
      headers = 'ID,Name,SKU,Category,Price,MRP,Stock,Status\n';
      rows = products.map(p => `"${p.id}","${p.name}","${p.sku}","${p.category}",${p.price},${p.mrp},${p.stock},"${p.status}"`);
      fileName = 'Products-Report.csv';
    } else if (dataType === 'orders') {
      headers = 'Order ID,Customer,Phone,Products,Total Value,Method,Payment,Delivery Status,Address,Date\n';
      rows = ordersList.map(o => {
        const products = o.items.map((item: any) => `${item.name} x${item.quantity}`).join('; ');
        const addr = `${o.deliveryAddress.street || ''} ${o.deliveryAddress.village || ''} ${o.deliveryAddress.district || ''}`;
        return `"${o.id}","${o.deliveryAddress.name}","${o.deliveryAddress.phone || ''}","${products}",${o.grandTotal},"${o.paymentMethod}","${o.paymentStatus}","${o.status}","${addr.trim()}","${new Date(o.createdAt).toLocaleString()}"`;
      });
      fileName = 'Orders-Report.csv';
    } else if (dataType === 'customers') {
      headers = 'Name,Email,Phone,Role,Addresses,Wallet Balance,Reward Points,Total Orders,Registered On,Status\n';
      rows = customersList.map((c: any) => {
        const orderCount = ordersList.filter(o => o.userId === c.id).length;
        return `"${c.name}","${c.email}","${c.phone}","${c.role}",${c.addresses},${c.walletBalance || 0},${c.rewardPoints || 0},${orderCount},"${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}","${c.status}"`;
      });
      fileName = 'Customers-Report.csv';
    } else if (dataType === 'payments') {
      headers = 'Order ID,Customer,Phone,Total Amount,Payment Method,Payment Status,Order Date\n';
      rows = ordersList.map(o => {
        return `"${o.id}","${o.deliveryAddress.name}","${o.deliveryAddress.phone || ''}",${o.grandTotal},"${o.paymentMethod}","${o.paymentStatus}","${new Date(o.createdAt).toLocaleString()}"`;
      });
      fileName = 'Payments-Report.csv';
    } else if (dataType === 'delivery') {
      headers = 'Order ID,Customer,Phone,Address,Delivery Status,Payment Status,Order Date\n';
      rows = ordersList.map(o => {
        const addr = `${o.deliveryAddress.street || ''} ${o.deliveryAddress.village || ''} ${o.deliveryAddress.district || ''}`;
        return `"${o.id}","${o.deliveryAddress.name}","${o.deliveryAddress.phone || ''}","${addr.trim()}","${o.status}","${o.paymentStatus}","${new Date(o.createdAt).toLocaleString()}"`;
      });
      fileName = 'Delivery-Report.csv';
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + headers + rows.join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = fileName;
    link.click();
    showToast(`${fileName} exported successfully!`, "success");
  };

  // Dynamic Print PDF Report
  const triggerPDFReport = () => {
    window.print();
  };

  // Helper: status color classes
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-emerald-500/10 text-emerald-600';
      case 'Paid': return 'bg-emerald-500/10 text-emerald-600';
      case 'Confirmed': return 'bg-blue-500/10 text-blue-600';
      case 'Packed': return 'bg-indigo-500/10 text-indigo-600';
      case 'Shipped': return 'bg-violet-500/10 text-violet-600';
      case 'Out for Delivery': return 'bg-amber-500/10 text-amber-600';
      case 'Pending': return 'bg-orange-500/10 text-orange-600';
      case 'Cancelled': return 'bg-red-500/10 text-red-500';
      case 'Returned': return 'bg-rose-500/10 text-rose-500';
      case 'Failed': return 'bg-red-500/10 text-red-500';
      case 'Refunded': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  // Filtered orders for payments tab
  const filteredPaymentOrders = paymentFilter === 'all'
    ? ordersList
    : ordersList.filter(o => o.paymentStatus === paymentFilter);

  // Filtered orders for delivery tab
  const filteredDeliveryOrders = deliveryFilter === 'all'
    ? ordersList
    : ordersList.filter(o => o.status === deliveryFilter);

  // Delivery pipeline counts
  const deliveryPipeline = [
    { status: 'Pending', count: ordersList.filter(o => o.status === 'Pending').length, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { status: 'Confirmed', count: ordersList.filter(o => o.status === 'Confirmed').length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { status: 'Packed', count: ordersList.filter(o => o.status === 'Packed').length, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { status: 'Shipped', count: ordersList.filter(o => o.status === 'Shipped').length, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { status: 'Out for Delivery', count: ordersList.filter(o => o.status === 'Out for Delivery').length, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { status: 'Delivered', count: ordersList.filter(o => o.status === 'Delivered').length, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { status: 'Cancelled', count: ordersList.filter(o => o.status === 'Cancelled').length, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
        <div className="space-y-4 max-w-sm text-center">
          <ShieldAlert className="h-14 w-14 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-xs text-slate-400">Admin privileges required to access analytics tables. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-all">
      
      {/* Sidebar Panel Left */}
      <aside className="hidden md:flex flex-col w-64 bg-primary text-white border-r border-slate-900 p-6 space-y-8 shrink-0 select-none">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" alt="Logo" className="h-10 w-10 rounded-full border border-accent" />
          <div className="flex flex-col text-left">
            <span className="font-display text-sm font-bold tracking-tight">REDDY ADMIN</span>
            <span className="text-[9px] text-accent uppercase font-bold tracking-widest leading-none mt-0.5">Control Center</span>
          </div>
        </Link>

        <div className="flex-1 flex flex-col gap-1.5 text-xs font-bold text-slate-350 text-left">
          {[
            { id: 'overview', label: 'Dashboard Analytics', icon: <BarChart3 className="h-4.5 w-4.5" /> },
            { id: 'products', label: 'Product Control', icon: <Package className="h-4.5 w-4.5" /> },
            { id: 'orders', label: 'Order Statuses', icon: <ShoppingBag className="h-4.5 w-4.5" /> },
            { id: 'customers', label: 'Customer Lists', icon: <Users className="h-4.5 w-4.5" /> },
            { id: 'payments', label: 'Payment Details', icon: <CreditCard className="h-4.5 w-4.5" /> },
            { id: 'delivery', label: 'Delivery Status', icon: <Truck className="h-4.5 w-4.5" /> },
            { id: 'reports', label: 'Reports', icon: <FileBarChart className="h-4.5 w-4.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsAddingProduct(false); }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-accent text-slate-900 shadow-md font-extrabold' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={() => router.push('/profile')}
          className="py-3 border border-slate-700 hover:border-white rounded-xl text-xs font-bold transition-all text-center"
        >
          Exit Admin Mode
        </button>
      </aside>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-slate-800 flex overflow-x-auto">
        {[
          { id: 'overview', icon: <BarChart3 className="h-4 w-4" />, label: 'Dashboard' },
          { id: 'products', icon: <Package className="h-4 w-4" />, label: 'Products' },
          { id: 'orders', icon: <ShoppingBag className="h-4 w-4" />, label: 'Orders' },
          { id: 'customers', icon: <Users className="h-4 w-4" />, label: 'Customers' },
          { id: 'payments', icon: <CreditCard className="h-4 w-4" />, label: 'Payments' },
          { id: 'delivery', icon: <Truck className="h-4 w-4" />, label: 'Delivery' },
          { id: 'reports', icon: <FileBarChart className="h-4 w-4" />, label: 'Reports' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setIsAddingProduct(false); }}
            className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-bold transition-all ${
              activeTab === tab.id ? 'text-accent' : 'text-slate-500'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Panel Content Right */}
      <main className="flex-grow p-6 sm:p-10 space-y-8 overflow-x-hidden text-left pb-24 md:pb-10">
        
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary dark:text-white leading-none">
              {activeTab === 'overview' && 'Dashboard Analytics'}
              {activeTab === 'products' && 'Product Database Management'}
              {activeTab === 'orders' && 'Real-Time Order Logistics'}
              {activeTab === 'customers' && 'Active Customer Database'}
              {activeTab === 'payments' && 'Payment Details & Collection'}
              {activeTab === 'delivery' && 'Delivery Status Tracker'}
              {activeTab === 'reports' && 'Business Reports & Analytics'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
              Reddy Premium Dairy Control Desk • Chiyyedu Farm
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <button 
              onClick={triggerPDFReport}
              className="px-4 py-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Print Report</span>
            </button>
            
            {activeTab === 'products' && !isAddingProduct && (
              <button 
                onClick={() => { clearProductForm(); setEditingProduct(null); setIsAddingProduct(true); }}
                className="px-4 py-2 bg-accent text-slate-900 hover:bg-accent-light rounded-xl flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 1. OVERVIEW TAB PANEL */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-splash">
            
            {/* Analytics Metric Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Revenue', value: `Rs. ${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-5 w-5 text-emerald-600" />, trend: 'Healthy Margin' },
                { title: "Today's Sales", value: `Rs. ${stats.todaySales.toFixed(2)}`, icon: <TrendingUp className="h-5 w-5 text-blue-600" />, trend: 'Slot Milkings' },
                { title: 'Registered Users', value: stats.customerCount, icon: <Users className="h-5 w-5 text-purple-600" />, trend: 'Active shoppers' },
                { title: 'Orders Received', value: stats.orderCount, icon: <ShoppingBag className="h-5 w-5 text-amber-600" />, trend: 'Morning pipelines' }
              ].map((card, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.title}</span>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl">{card.icon}</div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white leading-none">{card.value}</h2>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1.5 flex items-center gap-1">
                      <Check className="h-3 w-3 text-secondary" />
                      <span>{card.trend}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Low inventory alerts panel */}
            {stats.lowStockProducts.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-3xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold">Inventory Refill Alerts</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    The following products are running low in stock: {stats.lowStockProducts.map((p: any) => `${p.name} (${p.stock} left)`).join(', ')}. Please coordinate with Chiyyedu factory plant.
                  </p>
                </div>
              </div>
            )}

            {/* Simulated charts graphs container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Revenue Trend chart */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Sales Breakdown (Rs.)</h3>
                
                {/* SVG simulated Chart */}
                <div className="h-52 w-full flex items-end justify-between pt-4 gap-2">
                  {stats.revenueHistory.map((h: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-primary dark:bg-accent rounded-t-lg transition-all duration-500 shadow-sm"
                        style={{ height: `${Math.max(10, Math.min(100, (h.revenue / 1000) * 100))}%` }}
                        title={`Rs. ${h.revenue}`}
                      />
                      <span className="text-[8px] font-bold text-slate-400 rotate-12 mt-1 whitespace-nowrap">{h.label.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best selling products */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Best Selling Products</h3>
                <div className="space-y-3.5 pt-2">
                  {stats.bestSellers.map((item: any, idx: number) => (
                    <div key={item.id} className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 bg-slate-50 dark:bg-slate-950 rounded-md flex items-center justify-center font-bold text-slate-400">{idx+1}</span>
                        <p className="text-slate-700 dark:text-slate-200 truncate max-w-xs">{item.name}</p>
                      </div>
                      <p className="text-slate-400 shrink-0 font-bold">{item.qty} sold (Rs. {item.revenue.toFixed(2)})</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 2. PRODUCTS CRUD TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-splash">
            
            {isAddingProduct ? (
              /* PRODUCT EDIT/ADD FORM */
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-md max-w-2xl">
                <div className="flex justify-between border-b pb-3 mb-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display">
                    {editingProduct ? 'Modify Product Specifications' : 'Define New Product'}
                  </h3>
                  <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-xs font-bold text-red-500">Cancel</button>
                </div>
                
                <form onSubmit={handleProductSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Name *</label>
                    <input 
                      type="text" required value={prodName} onChange={(e) => setProdName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-250"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category *</label>
                    <select 
                      value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-3 py-3 outline-none focus:border-accent font-semibold"
                    >
                      <option value="Fresh Milk">Fresh Milk</option>
                      <option value="Curd">Curd & Yogurt</option>
                      <option value="Paneer">Paneer</option>
                      <option value="Ghee">Ghee</option>
                      <option value="Butter">Butter</option>
                      <option value="Cheese">Cheese</option>
                      <option value="Cream">Cream</option>
                      <option value="Buttermilk">Buttermilk</option>
                      <option value="Lassi">Lassi</option>
                      <option value="Milkshake">Milkshake</option>
                      <option value="Khova">Khova</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU Code *</label>
                    <input 
                      type="text" required placeholder="REDDY-COW-500" value={prodSKU} onChange={(e) => setProdSKU(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-250"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price (Rs.) *</label>
                    <input 
                      type="number" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-250"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRP (Rs.)</label>
                    <input 
                      type="number" value={prodMRP} onChange={(e) => setProdMRP(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-250"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Initial Stock *</label>
                    <input 
                      type="number" required value={prodStock} onChange={(e) => setProdStock(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-250"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight / Vol</label>
                    <input 
                      type="text" placeholder="500 ml or 200g" value={prodWeight} onChange={(e) => setProdWeight(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-250"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea 
                      rows={3} value={prodDescription} onChange={(e) => setProdDescription(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-250"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="sm:col-span-2 py-3 bg-secondary text-white font-bold rounded-xl mt-4"
                  >
                    Save Product
                  </button>
                </form>
              </div>
            ) : (
              /* PRODUCTS CONTROL LIST */
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database Tables</p>
                  <button onClick={() => exportToCSV('products')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                    <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Product</th>
                        <th className="px-6 py-4">SKU</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Stock</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-white truncate max-w-xs">{p.name}</td>
                          <td className="px-6 py-4 font-mono">{p.sku}</td>
                          <td className="px-6 py-4">{p.category}</td>
                          <td className="px-6 py-4">Rs. {p.price.toFixed(2)}</td>
                          <td className="px-6 py-4">{p.stock}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.stock > 10 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 flex justify-center gap-3">
                            <button onClick={() => startEditProduct(p)} className="p-1 hover:text-primary" title="Edit"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-1 hover:text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 3. ORDERS STATUSES MANAGEMENT */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-splash">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logistics Desk • {ordersList.length} Orders</p>
              <button onClick={() => exportToCSV('orders')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>

            {ordersList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center shadow-sm">
                <ShoppingBag className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No orders yet</p>
                <p className="text-[10px] text-slate-400 mt-1">When customers place orders, they will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4">Order ID</th>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Phone</th>
                      <th className="px-4 py-4">Products Ordered</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Payment</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Date & Time</th>
                      <th className="px-4 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                    {ordersList.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="px-4 py-4 font-mono font-bold text-slate-800 dark:text-white text-[11px]">#{o.id.slice(4)}</td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{o.deliveryAddress.name}</p>
                            <p className="text-[9px] text-slate-400 truncate max-w-[140px]">{o.deliveryAddress.street}{o.deliveryAddress.village ? `, ${o.deliveryAddress.village}` : ''}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-[11px]">{o.deliveryAddress.phone || '—'}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-0.5 max-w-[180px]">
                            {o.items.map((item: any, idx: number) => (
                              <p key={idx} className="text-[10px] truncate">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                                <span className="text-slate-400"> × {item.quantity}</span>
                                <span className="text-slate-400 ml-1">₹{(item.price * item.quantity).toFixed(0)}</span>
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">₹{o.grandTotal.toFixed(2)}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold block w-fit ${o.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                              {o.paymentStatus}
                            </span>
                            <p className="text-[9px] text-slate-400">{o.paymentMethod}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(o.status)}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-[10px] text-slate-400">
                            <p className="font-bold text-slate-600 dark:text-slate-300">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p>{new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border text-[11px] rounded-lg px-2 py-1 outline-none font-semibold focus:border-accent"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Packed">Packed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 4. CUSTOMERS LIST PANEL */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'customers' && (
          <div className="space-y-4 animate-splash">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold">Registered Customers • {customersList.length} Users</p>
              <button onClick={() => exportToCSV('customers')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>

            {customersList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center shadow-sm">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No registered customers yet</p>
                <p className="text-[10px] text-slate-400 mt-1">When users register on the website, they will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Email</th>
                      <th className="px-4 py-4">Mobile</th>
                      <th className="px-4 py-4">Role</th>
                      <th className="px-4 py-4">Addresses</th>
                      <th className="px-4 py-4">Wallet</th>
                      <th className="px-4 py-4">Reward Pts</th>
                      <th className="px-4 py-4">Orders</th>
                      <th className="px-4 py-4">Registered</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                    {customersList.map((c: any, idx: number) => {
                      const customerOrders = ordersList.filter(o => o.userId === c.id).length;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-4 py-4 font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{c.name}</td>
                          <td className="px-4 py-4 text-[11px]">{c.email}</td>
                          <td className="px-4 py-4 font-mono text-[11px]">{c.phone ? `+91 ${c.phone}` : '—'}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.role === 'admin' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'}`}>
                              {c.role}
                            </span>
                          </td>
                          <td className="px-4 py-4">{c.addresses}</td>
                          <td className="px-4 py-4">₹{c.walletBalance || 0}</td>
                          <td className="px-4 py-4">{c.rewardPoints || 0} pts</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${customerOrders > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'text-slate-400'}`}>
                              {customerOrders}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-[10px] text-slate-400">
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                              {c.isVerified ? '✓ Verified' : c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 5. PAYMENT DETAILS TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-splash">

            {/* Payment Summary Cards */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Collected</span>
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                  </div>
                  <h3 className="text-lg font-bold font-display text-emerald-600">₹{(stats.totalCollected || 0).toFixed(2)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Collection</span>
                    <div className="p-1.5 bg-amber-500/10 rounded-lg"><Clock className="h-4 w-4 text-amber-600" /></div>
                  </div>
                  <h3 className="text-lg font-bold font-display text-amber-600">₹{(stats.totalPending || 0).toFixed(2)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Revenue</span>
                    <div className="p-1.5 bg-blue-500/10 rounded-lg"><IndianRupee className="h-4 w-4 text-blue-600" /></div>
                  </div>
                  <h3 className="text-lg font-bold font-display text-blue-600">₹{stats.totalRevenue.toFixed(2)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Orders</span>
                    <div className="p-1.5 bg-purple-500/10 rounded-lg"><Receipt className="h-4 w-4 text-purple-600" /></div>
                  </div>
                  <h3 className="text-lg font-bold font-display text-purple-600">{stats.orderCount}</h3>
                </div>
              </div>
            )}

            {/* Payment Method Distribution */}
            {stats?.paymentMethodDistribution && stats.paymentMethodDistribution.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Payment Method Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stats.paymentMethodDistribution.map((pm: any) => (
                    <div key={pm.method} className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 text-center space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{pm.method}</p>
                      <p className="text-lg font-bold font-display text-slate-800 dark:text-white">{pm.count}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">₹{pm.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter & Export Bar */}
            <div className="flex flex-wrap justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filter:</span>
                {['all', 'Paid', 'Pending', 'Failed', 'Refunded'].map(f => (
                  <button
                    key={f}
                    onClick={() => setPaymentFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      paymentFilter === f
                        ? 'bg-accent text-slate-900 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
              <button onClick={() => exportToCSV('payments')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                <Download className="h-4 w-4" /> Export Payments CSV
              </button>
            </div>

            {/* Payment Orders Table */}
            {filteredPaymentOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center shadow-sm">
                <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No payment records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4">Order ID</th>
                      <th className="px-4 py-4">Customer Name</th>
                      <th className="px-4 py-4">Mobile</th>
                      <th className="px-4 py-4">Products</th>
                      <th className="px-4 py-4">Total Amount</th>
                      <th className="px-4 py-4">Payment Method</th>
                      <th className="px-4 py-4">Payment Status</th>
                      <th className="px-4 py-4">Order Date</th>
                      <th className="px-4 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                    {filteredPaymentOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="px-4 py-4 font-mono font-bold text-slate-800 dark:text-white text-[11px]">#{o.id.slice(4)}</td>
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">{o.deliveryAddress.name}</td>
                        <td className="px-4 py-4 font-mono text-[11px]">{o.deliveryAddress.phone || '—'}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-0.5 max-w-[160px]">
                            {o.items.map((item: any, idx: number) => (
                              <p key={idx} className="text-[10px] truncate">
                                {item.name} <span className="text-slate-400">×{item.quantity}</span>
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">₹{o.grandTotal.toFixed(2)}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
                            {o.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(o.paymentStatus)}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-[10px] text-slate-400">
                            <p className="font-bold text-slate-600 dark:text-slate-300">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p>{new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {o.paymentStatus !== 'Paid' ? (
                            <button
                              onClick={() => handlePaymentStatusChange(o.id, 'Paid')}
                              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-colors"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Collected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 6. DELIVERY STATUS TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'delivery' && (
          <div className="space-y-6 animate-splash">

            {/* Delivery Pipeline Overview */}
            <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Delivery Pipeline</h3>
              <div className="flex flex-wrap gap-2">
                {deliveryPipeline.map(stage => (
                  <button
                    key={stage.status}
                    onClick={() => setDeliveryFilter(stage.status === deliveryFilter ? 'all' : stage.status)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                      deliveryFilter === stage.status
                        ? `${stage.bg} border-current ${stage.color} shadow-sm`
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-lg font-bold font-display ${stage.color}`}>{stage.count}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stage.status}</span>
                  </button>
                ))}
                {deliveryFilter !== 'all' && (
                  <button
                    onClick={() => setDeliveryFilter('all')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    Show All
                  </button>
                )}
              </div>
            </div>

            {/* Export Bar */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {deliveryFilter === 'all' ? `All Deliveries • ${ordersList.length}` : `${deliveryFilter} • ${filteredDeliveryOrders.length}`}
              </p>
              <button onClick={() => exportToCSV('delivery')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                <Download className="h-4 w-4" /> Export Delivery CSV
              </button>
            </div>

            {/* Delivery Orders Table */}
            {filteredDeliveryOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center shadow-sm">
                <Truck className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No deliveries in this category</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4">Order ID</th>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Phone</th>
                      <th className="px-4 py-4">Delivery Address</th>
                      <th className="px-4 py-4">Products</th>
                      <th className="px-4 py-4">Order Status</th>
                      <th className="px-4 py-4">Payment</th>
                      <th className="px-4 py-4">Order Date</th>
                      <th className="px-4 py-4 text-center">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                    {filteredDeliveryOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="px-4 py-4 font-mono font-bold text-slate-800 dark:text-white text-[11px]">#{o.id.slice(4)}</td>
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">{o.deliveryAddress.name}</td>
                        <td className="px-4 py-4 font-mono text-[11px]">{o.deliveryAddress.phone || '—'}</td>
                        <td className="px-4 py-4">
                          <div className="max-w-[180px]">
                            <p className="text-[10px] truncate font-bold text-slate-700 dark:text-slate-300">{o.deliveryAddress.street}</p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {[o.deliveryAddress.village, o.deliveryAddress.district, o.deliveryAddress.state].filter(Boolean).join(', ')}
                            </p>
                            {o.deliveryAddress.pincode && (
                              <p className="text-[9px] text-slate-400 font-mono">PIN: {(o.deliveryAddress as any).pincode}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-0.5 max-w-[140px]">
                            {o.items.map((item: any, idx: number) => (
                              <p key={idx} className="text-[10px] truncate">{item.name} <span className="text-slate-400">×{item.quantity}</span></p>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(o.status)}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(o.paymentStatus)}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-[10px] text-slate-400">
                            <p className="font-bold text-slate-600 dark:text-slate-300">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p>{new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border text-[11px] rounded-lg px-2 py-1 outline-none font-semibold focus:border-accent"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Packed">Packed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 7. REPORTS TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && stats && (
          <div className="space-y-6 animate-splash">

            {/* Report Period Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-2">Period:</span>
              {(['daily', 'weekly', 'monthly'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setReportPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-[11px] font-bold capitalize transition-all ${
                    reportPeriod === period
                      ? 'bg-accent text-slate-900 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Revenue Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today's Revenue</span>
                <h3 className="text-lg font-bold font-display text-slate-800 dark:text-white">₹{stats.todaySales.toFixed(2)}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">This Month</span>
                <h3 className="text-lg font-bold font-display text-slate-800 dark:text-white">₹{stats.monthlySales.toFixed(2)}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">This Year</span>
                <h3 className="text-lg font-bold font-display text-slate-800 dark:text-white">₹{stats.yearlySales.toFixed(2)}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Profit</span>
                <h3 className="text-lg font-bold font-display text-emerald-600">₹{stats.profit.toFixed(2)}</h3>
                <p className="text-[9px] text-slate-400">22% margin</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Daily Revenue Chart (last 7 days) */}
              {stats.dailyRevenue && (
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Revenue (Last 7 Days)</h3>
                  <div className="h-48 w-full flex items-end justify-between pt-4 gap-2">
                    {stats.dailyRevenue.map((d: any, i: number) => {
                      const maxRev = Math.max(...stats.dailyRevenue.map((x: any) => x.revenue), 1);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                          <p className="text-[8px] font-bold text-slate-500">₹{d.revenue.toFixed(0)}</p>
                          <div 
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 dark:from-accent dark:to-yellow-400 rounded-t-lg transition-all duration-500 shadow-sm"
                            style={{ height: `${Math.max(4, (d.revenue / maxRev) * 100)}%` }}
                            title={`${d.label}: ₹${d.revenue.toFixed(2)} (${d.orders} orders)`}
                          />
                          <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{d.label.split(',')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method Distribution */}
              {stats.paymentMethodDistribution && (
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Method Distribution</h3>
                  <div className="space-y-3 pt-2">
                    {stats.paymentMethodDistribution.map((pm: any) => {
                      const total = stats.orderCount || 1;
                      const pct = ((pm.count / total) * 100).toFixed(1);
                      return (
                        <div key={pm.method} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-200">{pm.method}</span>
                            <span className="text-slate-400">{pm.count} orders ({pct}%) • ₹{pm.amount.toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 dark:from-accent dark:to-yellow-400 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Delivery Status Breakdown */}
              {stats.deliveryStatusBreakdown && (
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order Status Breakdown</h3>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {stats.deliveryStatusBreakdown.map((ds: any) => (
                      <div key={ds.status} className={`flex items-center gap-3 p-3 rounded-xl ${getStatusColor(ds.status)}`}>
                        <span className="text-xl font-bold font-display">{ds.count}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{ds.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sales by Category */}
              {stats.salesByCategoryData && stats.salesByCategoryData.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue by Category</h3>
                  <div className="space-y-3 pt-2">
                    {stats.salesByCategoryData.sort((a: any, b: any) => b.value - a.value).map((cat: any) => {
                      const maxVal = Math.max(...stats.salesByCategoryData.map((c: any) => c.value), 1);
                      const pct = ((cat.value / maxVal) * 100).toFixed(0);
                      return (
                        <div key={cat.category} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-200">{cat.category}</span>
                            <span className="text-slate-400">₹{cat.value.toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Revenue Trend */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Revenue Trend</h3>
                <div className="h-48 w-full flex items-end justify-between pt-4 gap-2">
                  {stats.revenueHistory.map((h: any, i: number) => {
                    const maxRev = Math.max(...stats.revenueHistory.map((x: any) => x.revenue), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <p className="text-[8px] font-bold text-slate-500">₹{h.revenue.toFixed(0)}</p>
                        <div 
                          className="w-full bg-gradient-to-t from-purple-500 to-purple-400 dark:from-purple-400 dark:to-pink-400 rounded-t-lg transition-all duration-500 shadow-sm"
                          style={{ height: `${Math.max(4, (h.revenue / maxRev) * 100)}%` }}
                          title={`${h.label}: ₹${h.revenue.toFixed(2)}`}
                        />
                        <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{h.label.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Acquisition Trend */}
              {stats.customerAcquisition && (
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer Acquisition (Last 6 Months)</h3>
                  <div className="h-48 w-full flex items-end justify-between pt-4 gap-2">
                    {stats.customerAcquisition.map((ca: any, i: number) => {
                      const maxCount = Math.max(...stats.customerAcquisition.map((x: any) => x.count), 1);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                          <p className="text-[9px] font-bold text-slate-500">{ca.count}</p>
                          <div 
                            className="w-full bg-gradient-to-t from-teal-500 to-teal-400 dark:from-teal-400 dark:to-cyan-400 rounded-t-lg transition-all duration-500 shadow-sm"
                            style={{ height: `${Math.max(4, (ca.count / maxCount) * 100)}%` }}
                            title={`${ca.label}: ${ca.count} new users`}
                          />
                          <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{ca.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Export All Reports */}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => exportToCSV('orders')} className="px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-accent transition-colors flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Orders Report
              </button>
              <button onClick={() => exportToCSV('payments')} className="px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-accent transition-colors flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Payments Report
              </button>
              <button onClick={() => exportToCSV('customers')} className="px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-accent transition-colors flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Customers Report
              </button>
              <button onClick={() => exportToCSV('products')} className="px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-accent transition-colors flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Products Report
              </button>
              <button onClick={() => exportToCSV('delivery')} className="px-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-accent transition-colors flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Delivery Report
              </button>
              <button onClick={triggerPDFReport} className="px-4 py-2.5 bg-accent text-slate-900 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5">
                <FileBarChart className="h-4 w-4" /> Print Full Report (PDF)
              </button>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
