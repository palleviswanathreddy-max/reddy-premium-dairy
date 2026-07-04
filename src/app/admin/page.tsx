'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { 
  Users, ShoppingBag, DollarSign, Package, TrendingUp, AlertTriangle,
  Plus, Edit2, Trash2, Download, Check, X, ShieldAlert, BarChart3, Settings
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
      // Simulate customer details retrieval from users
      const users = user ? [user] : [];
      // Grab customer account as well
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@gmail.com', password: 'user123' })
      });
      const data = await res.json();
      
      const list = [
        { name: "Palle Viswanath Reddy", email: "admin@reddy.com", phone: "+91 6300928511", wallet: 1000, rewardPoints: 1500, addresses: 1, role: "admin", status: "Active" }
      ];
      if (data.success) {
        list.push({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          wallet: data.user.walletBalance,
          rewardPoints: data.user.rewardPoints,
          addresses: data.user.addresses.length,
          role: "customer",
          status: "Active"
        });
      }
      setCustomersList(list);
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
        // Edit Mode
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Add Mode
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

  // CSV Report Exporter
  const exportToCSV = (dataType: 'products' | 'orders' | 'customers') => {
    let headers = '';
    let rows: any[] = [];
    let fileName = '';

    if (dataType === 'products') {
      headers = 'ID,Name,SKU,Category,Price,MRP,Stock,Status\n';
      rows = products.map(p => `"${p.id}","${p.name}","${p.sku}","${p.category}",${p.price},${p.mrp},${p.stock},"${p.status}"`);
      fileName = 'Products-Report.csv';
    } else if (dataType === 'orders') {
      headers = 'Order ID,Customer,Total Value,Method,Payment,Delivery Status,Date\n';
      rows = ordersList.map(o => `"${o.id}","${o.deliveryAddress.name}",${o.grandTotal},"${o.paymentMethod}","${o.paymentStatus}","${o.status}","${new Date(o.createdAt).toLocaleDateString()}"`);
      fileName = 'Orders-Report.csv';
    } else if (dataType === 'customers') {
      headers = 'Name,Email,Phone,Addresses,Wallet Balance,Reward Points,Role\n';
      rows = customersList.map(c => `"${c.name}","${c.email}","${c.phone}",${c.addresses},${c.wallet},${c.rewardPoints},"${c.role}"`);
      fileName = 'Customers-Report.csv';
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
            { id: 'customers', label: 'Customer Lists', icon: <Users className="h-4.5 w-4.5" /> }
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

      {/* Main Panel Content Right */}
      <main className="flex-grow p-6 sm:p-10 space-y-8 overflow-x-hidden text-left">
        
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary dark:text-white leading-none">
              {activeTab === 'overview' && 'Dashboard Analytics'}
              {activeTab === 'products' && 'Product Database Management'}
              {activeTab === 'orders' && 'Real-Time Order Logistics'}
              {activeTab === 'customers' && 'Active Customer Database'}
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

        {/* 1. OVERVIEW TAB PANEL */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-splash">
            
            {/* Analytics Metric Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Revenue', value: `Rs. ${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-5 w-5 text-emerald-600" />, trend: 'Healthy Margin' },
                { title: 'Today\'s Sales', value: `Rs. ${stats.todaySales.toFixed(2)}`, icon: <TrendingUp className="h-5 w-5 text-blue-600" />, trend: 'Slot Milkings' },
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

        {/* 2. PRODUCTS CRUD TAB */}
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

        {/* 3. ORDERS STATUSES MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-splash">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logistics Desk</p>
              <button onClick={() => exportToCSV('orders')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Logistics Status</th>
                    <th className="px-6 py-4 text-center">Change Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                  {ordersList.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-white">#{o.id.slice(4)}</td>
                      <td className="px-6 py-4 truncate max-w-[120px]">{o.deliveryAddress.name}</td>
                      <td className="px-6 py-4">Rs. {o.grandTotal.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${o.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center">
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
          </div>
        )}

        {/* 4. CUSTOMERS LIST PANEL */}
        {activeTab === 'customers' && (
          <div className="space-y-4 animate-splash">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold">Shopper database</p>
              <button onClick={() => exportToCSV('customers')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Addresses</th>
                    <th className="px-6 py-4">Wallet</th>
                    <th className="px-6 py-4">Reward Pts</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                  {customersList.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-white truncate max-w-xs">{c.name}</td>
                      <td className="px-6 py-4">{c.email}</td>
                      <td className="px-6 py-4">{c.phone}</td>
                      <td className="px-6 py-4">{c.addresses}</td>
                      <td className="px-6 py-4">Rs. {c.wallet}</td>
                      <td className="px-6 py-4">{c.rewardPoints} pts</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => showToast(`User status set to ${c.status === 'Active' ? 'Blocked' : 'Active'} (simulated)`, "info")}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}
                        >
                          {c.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
