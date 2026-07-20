'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { 
  Users, ShoppingBag, DollarSign, Package, TrendingUp, AlertTriangle,
  Plus, Edit2, Trash2, Download, Check, X, ShieldAlert, BarChart3,
  CreditCard, Truck, FileBarChart, IndianRupee, Clock, CheckCircle2,
  Receipt, PieChart, Activity, Ticket, Star, MessageSquare, RotateCcw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Product, Order } from '@/db/db';
import { useSession } from 'next-auth/react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, products, refreshProducts, updateOrderStatus, showToast } = useApp();
  const { status } = useSession();
  const redirecting = React.useRef(false);

  const [activeTab, setActiveTab] = useState('overview');
  
  // Stats state
  const [stats, setStats] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);

  // Insights state
  const [insightsSummary, setInsightsSummary] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedCustomerActivity, setSelectedCustomerActivity] = useState<any | null>(null);
  const [customerActivity, setCustomerActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [insightsFilter, setInsightsFilter] = useState('');
  
  // Product CRUD states
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New tabs states
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [quickAddQty, setQuickAddQty] = useState<Record<string, string>>({});

  const [deliveryPartnersList, setDeliveryPartnersList] = useState<any[]>([]);
  const [deliveryPartnersLoading, setDeliveryPartnersLoading] = useState(false);
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerVehicle, setPartnerVehicle] = useState('Hero Electric');
  const [partnerVehicleNumber, setPartnerVehicleNumber] = useState('');

  const [refundsList, setRefundsList] = useState<any[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundActionNote, setRefundActionNote] = useState('');

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<any | null>(null);

  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');

  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityLogsList, setActivityLogsList] = useState<any[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogsPage, setActivityLogsPage] = useState(1);
  const [activityLogsTotal, setActivityLogsTotal] = useState(0);

  // Product Form state
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Fresh Dairy');
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

  // New admin data fetching functions
  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      const res = await fetch('/api/admin/inventory');
      const data = await res.json();
      if (data.success) {
        setInventoryList(data.inventory || []);
        setInventorySummary(data.summary || null);
      }
    } catch (err) {
      console.error('[fetchInventory]', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchDeliveryPartners = async () => {
    setDeliveryPartnersLoading(true);
    try {
      const res = await fetch('/api/admin/delivery-partners');
      const data = await res.json();
      if (data.success) setDeliveryPartnersList(data.partners || []);
    } catch (err) {
      console.error('[fetchDeliveryPartners]', err);
    } finally {
      setDeliveryPartnersLoading(false);
    }
  };

  const fetchRefunds = async () => {
    setRefundsLoading(true);
    try {
      const res = await fetch('/api/admin/refunds');
      const data = await res.json();
      if (data.success) setRefundsList(data.refunds || []);
    } catch (err) {
      console.error('[fetchRefunds]', err);
    } finally {
      setRefundsLoading(false);
    }
  };

  const handleCustomerSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) setCustomerSearchResults(data.results || []);
    } catch (err) {
      console.error('[handleCustomerSearch]', err);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const fetchActivityLogs = async (userId = '', page = 1) => {
    setActivityLogsLoading(true);
    try {
      const url = userId 
        ? `/api/admin/activity-logs?userId=${userId}&page=${page}&limit=25`
        : `/api/admin/activity-logs?page=${page}&limit=25`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setActivityLogsList(data.activity || []);
        setActivityLogsTotal(data.total || 0);
      }
    } catch (err) {
      console.error('[fetchActivityLogs]', err);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  const submitIncomingStock = async (productId: string, qty: number, notes = '') => {
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ productId, quantity: qty, notes, addedBy: user?.name || 'Admin' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Stock added successfully!', 'success');
        fetchInventory();
        refreshProducts();
      } else {
        showToast(data.message || 'Failed to add stock', 'error');
      }
    } catch (err) {
      console.error('[submitIncomingStock]', err);
    }
  };

  const submitDeliveryPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName || !partnerPhone) return;
    try {
      const res = await fetch('/api/admin/delivery-partners', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ name: partnerName, phone: partnerPhone, email: partnerEmail, vehicle: partnerVehicle, vehicleNumber: partnerVehicleNumber })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Delivery partner registered!', 'success');
        setIsAddingPartner(false);
        setPartnerName('');
        setPartnerPhone('');
        setPartnerEmail('');
        setPartnerVehicle('Hero Electric');
        setPartnerVehicleNumber('');
        fetchDeliveryPartners();
      }
    } catch (err) {
      console.error('[submitDeliveryPartner]', err);
    }
  };

  const handleRefundAction = async (orderId: string, action: 'approve' | 'reject', refundAmt?: number) => {
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ orderId, action, refundAmount: refundAmt, adminNote: refundActionNote })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Refund request ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
        setRefundActionNote('');
        fetchRefunds();
        fetchAdminOrders();
      }
    } catch (err) {
      console.error('[handleRefundAction]', err);
    }
  };

  const assignDeliveryPartner = async (orderId: string, partnerId: string) => {
    if (!partnerId) return;
    try {
      const res = await fetch('/api/admin/delivery-partners/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ orderId, partnerId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Delivery partner assigned successfully!', 'success');
        fetchAdminOrders();
        fetchDeliveryPartners();
      }
    } catch (err) {
      console.error('[assignDeliveryPartner]', err);
    }
  };

  // Fetch functions declared BEFORE the useEffects that call them
  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      const res = await fetch('/api/orders?role=admin');
      const data = await res.json();
      if (data.success) setOrdersList(data.orders);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (data.success) setCustomersList(data.customers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminCoupons = async () => {
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      if (data.success) setCouponsList(data.coupons || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      if (data.success) setReviewsList(data.reviews || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (data.success) setTicketsList(data.tickets || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/admin/insights/summary');
      const data = await res.json();
      if (data.success) setInsightsSummary(data);
    } catch (err) {
      console.error('[fetchInsights]', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchCustomerActivity = async (userId: string) => {
    setActivityLoading(true);
    setCustomerActivity([]);
    try {
      const res = await fetch(`/api/admin/customers/${userId}/activity?limit=50`);
      const data = await res.json();
      if (data.success) setCustomerActivity(data.activity);
    } catch (err) {
      console.error('[fetchCustomerActivity]', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const exportInsightsCSV = () => {
    if (!insightsSummary?.perCustomer?.length) return;
    const rows = insightsSummary.perCustomer.map((c: any) => ({
      userId: c.userId,
      name: customersList.find((cu: any) => cu.id === c.userId)?.name || c.userId,
      email: customersList.find((cu: any) => cu.id === c.userId)?.email || '',
      views: c.views,
      cartAdds: c.cartAdds || 0,
      purchases: c.purchases,
      totalSpent: (c.spent || 0).toFixed(2),
      lastActive: c.lastActive ? new Date(c.lastActive).toLocaleDateString() : 'N/A'
    }));
    const headers = ['userId', 'name', 'email', 'views', 'cartAdds', 'purchases', 'totalSpent', 'lastActive'];
    const csv = [headers.join(','), ...rows.map((r: any) => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'customer_insights.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Prevent redirecting while NextAuth is loading or while session is authenticated but user state hasn't loaded yet
    if (status === 'loading' || (status === 'authenticated' && !user)) return;

    /* eslint-disable react-hooks/set-state-in-effect */
    if (!user || user.role !== 'admin') {
      if (!redirecting.current) {
        redirecting.current = true;
        router.push('/');
        showToast("Access Denied: Admin role required", "error");
      }
    } else {
      fetchAdminStats();
      fetchAdminOrders();
      fetchAdminCustomers();
      fetchAdminCoupons();
      fetchAdminReviews();
      fetchAdminTickets();

      // Establish EventSource for instant real-time order/stats updates
      let eventSource: EventSource | null = null;
      try {
        eventSource = new EventSource('/api/events?userId=admin');
        const handleLiveUpdate = () => {
          fetchAdminOrders();
          fetchAdminStats();
        };
        eventSource.addEventListener('order_created', handleLiveUpdate);
        eventSource.addEventListener('order_updated', handleLiveUpdate);
        eventSource.onmessage = handleLiveUpdate;
      } catch (err) {
        console.error('Failed to establish EventSource connection in Admin panel:', err);
      }

      const interval = setInterval(() => {
        fetchAdminStats();
        fetchAdminOrders();
      }, 6000);

      return () => {
        if (eventSource) eventSource.close();
        clearInterval(interval);
      };
    }
    /* eslint-enable react-hooks/set-state-in-effect */
     
  }, [user, status, router, showToast]);

  // Fetch insights when tab is activated
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (activeTab === 'insights' && !insightsSummary) {
      fetchInsights();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
     
  }, [activeTab, insightsSummary]);

  // Load data for active tab
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (activeTab === 'inventory') fetchInventory();
    else if (activeTab === 'delivery-partners') fetchDeliveryPartners();
    else if (activeTab === 'refunds') fetchRefunds();
    else if (activeTab === 'activity') fetchActivityLogs('', activityLogsPage);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTab, activityLogsPage]);

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
      gst: prodCategory === 'Ghee' ? 12 : ['Butter & Cream', 'Cheese Range', 'Curd & Fermented', 'Beverage Range'].includes(prodCategory) ? 5 : 0,
      expiryDays: prodCategory === 'Ghee' ? 180 : ['Butter & Cream', 'Cheese Range'].includes(prodCategory) ? 30 : 3,
      deliveryTime: ['Fresh Dairy', 'Curd & Fermented'].includes(prodCategory) ? "6:00 AM - 9:00 AM Tomorrow" : "Same Day (Within 3 Hours)",
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
    setProdCategory('Fresh Dairy');
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
        <div className="flex-1 flex flex-col gap-1.5 text-xs font-bold text-slate-350 text-left overflow-y-auto pr-1">
          {[
            { id: 'overview', label: 'Dashboard Analytics', icon: <BarChart3 className="h-4.5 w-4.5" /> },
            { id: 'products', label: 'Product Control', icon: <Package className="h-4.5 w-4.5" /> },
            { id: 'inventory', label: 'Inventory Control', icon: <Package className="h-4.5 w-4.5" /> },
            { id: 'orders', label: 'Order Statuses', icon: <ShoppingBag className="h-4.5 w-4.5" /> },
            { id: 'delivery-partners', label: 'Delivery Partners', icon: <Truck className="h-4.5 w-4.5" /> },
            { id: 'refunds', label: 'Refund Manager', icon: <RotateCcw className="h-4.5 w-4.5" /> },
            { id: 'customers', label: 'Customer Lists', icon: <Users className="h-4.5 w-4.5" /> },
            { id: 'coupons', label: 'Coupons & Offers', icon: <Ticket className="h-4.5 w-4.5" /> },
            { id: 'reviews', label: 'User Reviews', icon: <Star className="h-4.5 w-4.5" /> },
            { id: 'tickets', label: 'Support Tickets', icon: <MessageSquare className="h-4.5 w-4.5" /> },
            { id: 'payments', label: 'Payment Details', icon: <CreditCard className="h-4.5 w-4.5" /> },
            { id: 'delivery', label: 'Delivery Status', icon: <Truck className="h-4.5 w-4.5" /> },
            { id: 'reports', label: 'Reports & Analytics', icon: <FileBarChart className="h-4.5 w-4.5" /> },
            { id: 'insights', label: 'Customer Insights', icon: <Activity className="h-4.5 w-4.5" /> },
            { id: 'activity', label: 'Customer Activities', icon: <Activity className="h-4.5 w-4.5" /> },
            { id: 'export', label: 'Export Reports', icon: <Download className="h-4.5 w-4.5" /> },
            { id: 'whatsapp', label: 'WhatsApp Settings', icon: <MessageSquare className="h-4.5 w-4.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'whatsapp') {
                  router.push('/admin/whatsapp');
                } else {
                  setActiveTab(tab.id);
                  setIsAddingProduct(false);
                }
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all ${
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
          { id: 'inventory', icon: <Package className="h-4 w-4" />, label: 'Inventory' },
          { id: 'orders', icon: <ShoppingBag className="h-4 w-4" />, label: 'Orders' },
          { id: 'delivery-partners', icon: <Truck className="h-4 w-4" />, label: 'Partners' },
          { id: 'refunds', icon: <RotateCcw className="h-4 w-4" />, label: 'Refunds' },
          { id: 'customers', icon: <Users className="h-4 w-4" />, label: 'Customers' },
          { id: 'coupons', icon: <Ticket className="h-4 w-4" />, label: 'Coupons' },
          { id: 'reviews', icon: <Star className="h-4 w-4" />, label: 'Reviews' },
          { id: 'tickets', icon: <MessageSquare className="h-4 w-4" />, label: 'Tickets' },
          { id: 'payments', icon: <CreditCard className="h-4 w-4" />, label: 'Payments' },
          { id: 'delivery', icon: <Truck className="h-4 w-4" />, label: 'Delivery' },
          { id: 'reports', icon: <FileBarChart className="h-4 w-4" />, label: 'Reports' },
          { id: 'insights', icon: <Activity className="h-4 w-4" />, label: 'Insights' },
          { id: 'activity', icon: <Activity className="h-4 w-4" />, label: 'Activities' },
          { id: 'export', icon: <Download className="h-4 w-4" />, label: 'Export' },
          { id: 'whatsapp', icon: <MessageSquare className="h-4 w-4" />, label: 'WhatsApp' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'whatsapp') {
                router.push('/admin/whatsapp');
              } else {
                setActiveTab(tab.id);
                setIsAddingProduct(false);
              }
            }}
            className={`flex-grow min-w-[60px] flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-bold transition-all ${
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
              {activeTab === 'inventory' && 'Inventory Control & Logs'}
              {activeTab === 'orders' && 'Real-Time Order Logistics'}
              {activeTab === 'delivery-partners' && 'Delivery Partners Directory'}
              {activeTab === 'refunds' && 'Customer Refund Requests'}
              {activeTab === 'coupons' && 'Coupons & Offers Management'}
              {activeTab === 'reviews' && 'Customer Reviews Moderation'}
              {activeTab === 'tickets' && 'Customer Support Tickets'}
              {activeTab === 'customers' && 'Active Customer Database'}
              {activeTab === 'payments' && 'Payment Details & Collection'}
              {activeTab === 'delivery' && 'Delivery Status Tracker'}
              {activeTab === 'reports' && 'Business Reports & Analytics'}
              {activeTab === 'insights' && 'Customer Behaviour Insights'}
              {activeTab === 'activity' && 'Real-Time Activity Auditing'}
              {activeTab === 'export' && 'Universal Data Exporters'}
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
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monthly Sales Breakdown (Rs.)</h3>
                <div className="h-56 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenueHistory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        dy={10} 
                        tickFormatter={(val) => val.split(' ')[0]} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        dx={-10} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#0ea5e9' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#0ea5e9" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} 
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
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

              {/* Order Status Distribution */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Order Status Pipeline</h3>
                  <div className="space-y-2">
                    {deliveryPipeline.map(item => (
                      <div key={item.status} className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">{item.status}</span>
                        <span className={`${item.color} font-bold`}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-56 w-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={deliveryPipeline.filter(p => p.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        stroke="none"
                      >
                        {deliveryPipeline.filter(p => p.count > 0).map((entry, index) => {
                          const colors = ['#f97316', '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black font-display text-slate-800 dark:text-white">{stats.orderCount}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Orders</span>
                  </div>
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
                      <option value="Fresh Dairy">Fresh Dairy</option>
                      <option value="Curd & Fermented">Curd & Fermented</option>
                      <option value="Cheese Range">Cheese Range</option>
                      <option value="Butter & Cream">Butter & Cream</option>
                      <option value="Ghee">Ghee</option>
                      <option value="Beverage Range">Beverage Range</option>
                      <option value="Traditional Products">Traditional Products</option>
                      <option value="Milk Powder & Ingredients">Milk Powder & Ingredients</option>
                      <option value="Desserts">Desserts</option>
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
                      <th className="px-4 py-4">Delivery Partner</th>
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
                            value={(o as any).deliveryPartnerId || ''}
                            onChange={(e) => assignDeliveryPartner(o.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border text-[11px] rounded-lg px-2 py-1 outline-none font-semibold focus:border-accent"
                          >
                            <option value="">Unassigned</option>
                            {deliveryPartnersList.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.vehicle})</option>
                            ))}
                          </select>
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
            {/* Search Input Bar */}
            <div className="flex flex-wrap justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm gap-3">
              <div className="flex items-center gap-2 flex-grow max-w-md">
                <input 
                  type="text" 
                  placeholder="Advanced search by name, phone, email, or order ID..." 
                  value={customerSearchQuery}
                  onChange={e => {
                    setCustomerSearchQuery(e.target.value);
                    handleCustomerSearch(e.target.value);
                  }}
                  className="w-full text-xs px-4 py-2 border rounded-xl bg-transparent outline-none focus:border-accent"
                />
              </div>
              <button onClick={() => exportToCSV('customers')} className="text-xs font-bold text-primary dark:text-accent flex items-center gap-1">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>

            {customerSearchLoading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
            ) : customerSearchQuery.trim().length >= 2 ? (
              /* ADVANCED SEARCH RESULTS */
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 font-bold">Search Results ({customerSearchResults.length})</h3>
                {customerSearchResults.length === 0 ? (
                  <p className="text-xs text-slate-400">No matching customers found</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                      <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-4">Name</th>
                          <th className="px-4 py-4">Contact</th>
                          <th className="px-4 py-4">Role</th>
                          <th className="px-4 py-4">Wallet</th>
                          <th className="px-4 py-4">Reward Pts</th>
                          <th className="px-4 py-4">Total Orders</th>
                          <th className="px-4 py-4">Spending</th>
                          <th className="px-4 py-4">Last Active</th>
                          <th className="px-4 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-650">
                        {customerSearchResults.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                            <td className="px-4 py-4 font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{c.name}</td>
                            <td className="px-4 py-4 text-[11px]">
                              <p>{c.email}</p>
                              <p className="font-mono text-[10px] text-slate-400">{c.phone}</p>
                            </td>
                            <td className="px-4 py-4 capitalize">{c.role}</td>
                            <td className="px-4 py-4">₹{c.walletBalance}</td>
                            <td className="px-4 py-4">{c.rewardPoints} pts</td>
                            <td className="px-4 py-4">{c.totalOrders}</td>
                            <td className="px-4 py-4 font-bold">₹{c.totalSpending.toFixed(2)}</td>
                            <td className="px-4 py-4 text-[10px] text-slate-450">{c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString('en-IN') : 'N/A'}</td>
                            <td className="px-4 py-4 text-center">
                              <button 
                                onClick={() => setSelectedCustomerProfile(c)}
                                className="px-3 py-1.5 bg-accent text-slate-900 font-bold rounded-lg text-[10px] shadow"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : customersList.length === 0 ? (
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

            {/* Customer Profile Details Modal */}
            {selectedCustomerProfile && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCustomerProfile(null)}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white">{selectedCustomerProfile.name}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Customer Profile Details</p>
                    </div>
                    <button onClick={() => setSelectedCustomerProfile(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Left: Quick facts */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border space-y-3 text-xs">
                        <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Quick Stats</h4>
                        <div className="space-y-2">
                          <p><span className="text-slate-400">User ID:</span> <span className="font-mono">{selectedCustomerProfile.id}</span></p>
                          <p><span className="text-slate-400">Email:</span> {selectedCustomerProfile.email}</p>
                          <p><span className="text-slate-400">Phone:</span> {selectedCustomerProfile.phone || 'N/A'}</p>
                          <p><span className="text-slate-400">Loyalty Balance:</span> <span className="font-bold text-amber-500">{selectedCustomerProfile.rewardPoints} pts</span></p>
                          <p><span className="text-slate-400">Wallet:</span> <span className="font-bold text-emerald-600">₹{selectedCustomerProfile.walletBalance}</span></p>
                          <p><span className="text-slate-400">Total Spent:</span> <span className="font-bold text-slate-800 dark:text-white">₹{selectedCustomerProfile.totalSpending.toFixed(2)}</span></p>
                          <p><span className="text-slate-400">Registered:</span> {selectedCustomerProfile.createdAt ? new Date(selectedCustomerProfile.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>

                      {/* Middle: Addresses */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border space-y-3 text-xs md:col-span-2">
                        <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Shipping Addresses</h4>
                        {!selectedCustomerProfile.addresses || selectedCustomerProfile.addresses.length === 0 ? (
                          <p className="text-slate-450 italic">No addresses saved</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedCustomerProfile.addresses.map((addr: any, idx: number) => (
                              <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border">
                                <p className="font-bold">{addr.name}</p>
                                <p className="text-[11px] text-slate-450 mt-1">{addr.street}, {addr.village || ''}, {addr.district}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">PIN: {addr.pincode}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order History */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Recent Orders ({selectedCustomerProfile.orderHistory?.length || 0})</h4>
                      {!selectedCustomerProfile.orderHistory || selectedCustomerProfile.orderHistory.length === 0 ? (
                        <p className="text-xs text-slate-455 italic">No orders placed yet</p>
                      ) : (
                        <div className="border rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-955 border-b text-[10px] text-slate-400 font-bold GTM uppercase">
                                <th className="p-3">Order ID</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Items</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {selectedCustomerProfile.orderHistory.map((ord: any) => (
                                <tr key={ord.id} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-mono font-bold">#{ord.id.slice(4)}</td>
                                  <td className="p-3">{new Date(ord.createdAt).toLocaleDateString()}</td>
                                  <td className="p-3 truncate max-w-[200px]">{ord.items.map((i: any) => `${i.name} x${i.quantity}`).join(', ')}</td>
                                  <td className="p-3 font-bold">₹{ord.grandTotal.toFixed(2)}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getStatusColor(ord.status)}`}>{ord.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 5. COUPONS TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'coupons' && (
          <div className="space-y-6 animate-splash">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold">Promo Codes • {couponsList.length} Active</p>
              <button onClick={() => window.open('/admin/coupons', '_blank')} className="px-4 py-2 bg-accent text-slate-900 hover:bg-accent-light rounded-xl flex items-center gap-1.5 shadow-md text-xs font-bold transition-all">
                <Ticket className="h-4 w-4" /> Go to Full Coupon Manager
              </button>
            </div>

            {couponsList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center shadow-sm">
                <Ticket className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No active coupons</p>
                <p className="text-[10px] text-slate-400 mt-1">Create promotional coupons in the full Coupon Manager.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4">Code</th>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4">Value</th>
                      <th className="px-4 py-4">Min Purchase</th>
                      <th className="px-4 py-4">Valid Until</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                    {couponsList.map((c: any, idx: number) => {
                      const isExpired = new Date(c.validUntil) < new Date();
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="px-4 py-4 font-bold text-slate-800 dark:text-white uppercase">{c.code}</td>
                          <td className="px-4 py-4">{c.type.replace('_', ' ').toUpperCase()}</td>
                          <td className="px-4 py-4 text-emerald-600 font-bold">
                            {c.type === 'percentage' ? `${c.value}%` : c.type === 'flat' ? `₹${c.value}` : 'Free'}
                          </td>
                          <td className="px-4 py-4">₹{c.minPurchase}</td>
                          <td className="px-4 py-4">
                            {new Date(c.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              !c.isActive ? 'bg-slate-500/10 text-slate-500' :
                              isExpired ? 'bg-red-500/10 text-red-500' : 
                              'bg-emerald-500/10 text-emerald-600'
                            }`}>
                              {!c.isActive ? 'Inactive' : isExpired ? 'Expired' : 'Active'}
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
        {/* REVIEWS TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-splash">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold">User Reviews • {reviewsList.length} Total</p>
              <button onClick={() => window.open('/admin/reviews', '_blank')} className="px-4 py-2 bg-accent text-slate-900 hover:bg-accent-light rounded-xl flex items-center gap-1.5 shadow-md text-xs font-bold transition-all">
                <Star className="h-4 w-4" /> Go to Full Review Moderation
              </button>
            </div>

            {reviewsList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center shadow-sm">
                <Star className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No reviews yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Manage product reviews in the full Review Moderation panel.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4">User</th>
                      <th className="px-4 py-4">Rating</th>
                      <th className="px-4 py-4">Title</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                    {reviewsList.slice(0, 10).map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">{r.userName}</td>
                        <td className="px-4 py-4 text-yellow-500 font-bold flex items-center gap-1">
                          {r.rating} <Star className="h-3 w-3 fill-current" />
                        </td>
                        <td className="px-4 py-4">{r.title}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            r.status === 'spam' ? 'bg-orange-100 text-orange-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status}
                          </span>
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
        {/* TICKETS TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'tickets' && (
          <div className="space-y-6 animate-splash">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold">Support Tickets • {ticketsList.filter(t => t.status === 'Pending').length} Pending</p>
              <button onClick={() => window.open('/admin/tickets', '_blank')} className="px-4 py-2 bg-accent text-slate-900 hover:bg-accent-light rounded-xl flex items-center gap-1.5 shadow-md text-xs font-bold transition-all">
                <MessageSquare className="h-4 w-4" /> Go to Full Tickets Manager
              </button>
            </div>

            {ticketsList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center shadow-sm">
                <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No support tickets</p>
                <p className="text-[10px] text-slate-400 mt-1">Manage customer support tickets in the full Tickets Manager.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-900 text-left text-xs font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Subject</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-600 dark:text-slate-350">
                    {ticketsList.slice(0, 10).map((t: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">{t.name}</td>
                        <td className="px-4 py-4 truncate max-w-[200px]">{t.subject}</td>
                        <td className="px-4 py-4">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {t.status}
                          </span>
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
        {/* 6. PAYMENT DETAILS TAB */}
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
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today&apos;s Revenue</span>
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

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 8. CUSTOMER INSIGHTS TAB PANEL */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'insights' && (
          <div className="space-y-8 animate-splash">

            {/* Activity Timeline Modal */}
            {selectedCustomerActivity && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCustomerActivity(null)}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white">{selectedCustomerActivity.name || selectedCustomerActivity.userId}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Activity Timeline</p>
                    </div>
                    <button onClick={() => setSelectedCustomerActivity(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-6 space-y-3">
                    {activityLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
                      </div>
                    ) : customerActivity.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-xs font-semibold">No activity recorded yet</p>
                        <p className="text-[10px] mt-1">Activity logs are saved in PostgreSQL</p>
                      </div>
                    ) : (
                      customerActivity.map((event: any, i: number) => {
                        const icons: Record<string, string> = { view: '👁️', cart_add: '🛒', wishlist_add: '❤️', purchase: '✅', login: '🔑' };
                        const colors: Record<string, string> = {
                          view: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
                          cart_add: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
                          wishlist_add: 'border-pink-400 bg-pink-50 dark:bg-pink-900/20',
                          purchase: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
                          login: 'border-slate-400 bg-slate-50 dark:bg-slate-800/50'
                        };
                        return (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${colors[event.type] || 'border-slate-300'}`}>
                            <span className="text-base mt-0.5">{icons[event.type] || '●'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 dark:text-white capitalize">{event.type.replace('_', ' ')}</p>
                              {event.productName && <p className="text-[10px] text-slate-500 font-semibold truncate">{event.productName}</p>}
                              {event.orderId && <p className="text-[10px] text-emerald-600 font-semibold">Order #{event.orderId.slice(-8)}</p>}
                              {event.amount && <p className="text-[10px] text-slate-500 font-semibold">₹{event.amount.toFixed(2)}</p>}
                            </div>
                            <p className="text-[9px] text-slate-400 font-semibold whitespace-nowrap">{new Date(event.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {insightsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : insightsSummary ? (
              <>
                {/* KPI Widgets Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Conversion Rate', value: `${insightsSummary.conversionRate ?? 0}%`, sub: 'Viewers → Buyers', icon: <TrendingUp className="h-5 w-5 text-emerald-500" />, color: 'text-emerald-600' },
                    { label: 'Unique Viewers', value: insightsSummary.uniqueViewers ?? insightsSummary.perCustomer?.length ?? 0, sub: 'Product page views', icon: <Activity className="h-5 w-5 text-blue-500" />, color: 'text-blue-600' },
                    { label: 'Unique Buyers', value: insightsSummary.uniquePurchasers ?? 0, sub: 'Made at least 1 order', icon: <ShoppingBag className="h-5 w-5 text-amber-500" />, color: 'text-amber-600' },
                    { label: 'Total Events', value: Object.values(insightsSummary.eventTotals || {}).reduce((a: any, b: any) => a + b, 0), sub: 'Tracked interactions', icon: <PieChart className="h-5 w-5 text-purple-500" />, color: 'text-purple-600' },
                  ].map((card, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</span>
                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl">{card.icon}</div>
                      </div>
                      <h2 className={`text-2xl font-bold font-display ${card.color}`}>{card.value}</h2>
                      <p className="text-[10px] text-slate-400 font-semibold">{card.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Event Breakdown */}
                {insightsSummary.eventTotals && (
                  <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Event Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {Object.entries(insightsSummary.eventTotals).map(([type, count]: [string, any]) => {
                        const icons: Record<string, string> = { view: '👁️', cart_add: '🛒', wishlist_add: '❤️', purchase: '✅', login: '🔑' };
                        const colors: Record<string, string> = { view: 'bg-blue-500/10 text-blue-600', cart_add: 'bg-amber-500/10 text-amber-600', wishlist_add: 'bg-pink-500/10 text-pink-600', purchase: 'bg-emerald-500/10 text-emerald-600', login: 'bg-slate-500/10 text-slate-600' };
                        return (
                          <div key={type} className={`rounded-2xl p-4 text-center ${colors[type] || 'bg-slate-100'}`}>
                            <p className="text-xl">{icons[type] || '●'}</p>
                            <p className="text-lg font-bold font-display mt-1">{count}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-70 capitalize">{type.replace('_', ' ')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top Viewed — Not Purchased */}
                {insightsSummary.topViewedNotPurchased?.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">⚠️ Viewed But Not Purchased (Drop-off Risk)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800">
                            {['Product', 'Views', 'Purchases', 'Conversion %'].map(h => (
                              <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {insightsSummary.topViewedNotPurchased.map((p: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-200">{p.productName || p._id}</td>
                              <td className="py-3 px-3 text-blue-600 font-bold">{p.views}</td>
                              <td className="py-3 px-3 text-emerald-600 font-bold">{p.purchases}</td>
                              <td className="py-3 px-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.conversionRate < 10 ? 'bg-red-100 text-red-600' : p.conversionRate < 30 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                  {(p.conversionRate || 0).toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Per-Customer Activity Table */}
                <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Per-Customer Activity Log</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Filter by user ID or name..."
                        value={insightsFilter}
                        onChange={e => setInsightsFilter(e.target.value)}
                        className="text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:border-accent w-48"
                      />
                      <button onClick={exportInsightsCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-slate-900 rounded-xl text-[11px] font-bold">
                        <Download className="h-3.5 w-3.5" /> CSV
                      </button>
                      <button onClick={fetchInsights} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        ↻ Refresh
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          {['Customer', 'Views', 'Cart Adds', 'Purchases', 'Total Spent', 'Last Active', 'Action'].map(h => (
                            <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {insightsSummary.perCustomer
                          ?.filter((c: any) => {
                            if (!insightsFilter) return true;
                            const match = insightsFilter.toLowerCase();
                            const customer = customersList.find((cu: any) => cu.id === c.userId);
                            return c.userId.includes(match) || customer?.name?.toLowerCase().includes(match) || customer?.email?.toLowerCase().includes(match);
                          })
                          .map((c: any, i: number) => {
                            const customer = customersList.find((cu: any) => cu.id === c.userId);
                            return (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-3">
                                  <p className="font-bold text-slate-700 dark:text-white">{customer?.name || 'Unknown'}</p>
                                  <p className="text-[10px] text-slate-400">{customer?.email || c.userId}</p>
                                </td>
                                <td className="py-3 px-3 text-blue-600 font-bold">{c.views || 0}</td>
                                <td className="py-3 px-3 text-amber-600 font-bold">{c.cartAdds || 0}</td>
                                <td className="py-3 px-3 text-emerald-600 font-bold">{c.purchases || 0}</td>
                                <td className="py-3 px-3 font-bold">₹{(c.spent || 0).toFixed(2)}</td>
                                <td className="py-3 px-3 text-slate-400 text-[10px] font-semibold whitespace-nowrap">
                                  {c.lastActive ? new Date(c.lastActive).toLocaleDateString('en-IN') : '—'}
                                </td>
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => {
                                      setSelectedCustomerActivity({ ...c, name: customer?.name, email: customer?.email });
                                      fetchCustomerActivity(c.userId);
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-colors"
                                  >
                                    View Timeline
                                  </button>
                                </td>
                              </tr>
                            );
                        })}
                      </tbody>
                    </table>
                    {insightsSummary.perCustomer?.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-xs font-semibold">No activity data yet</p>
                        <p className="text-[10px] mt-1">Activity is recorded as customers browse and purchase.</p>
                        {insightsSummary.source === 'localdb' && (
                          <p className="text-[10px] mt-1 text-amber-500">{insightsSummary.note}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-semibold">Failed to load insights</p>
                <button onClick={fetchInsights} className="mt-4 px-4 py-2 bg-accent text-slate-900 rounded-xl text-xs font-bold">Retry</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 9. INVENTORY MANAGEMENT TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-splash">
            {/* Inventory Summary Cards */}
            {inventorySummary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total SKUs</span>
                  <h3 className="text-xl font-bold font-display">{inventorySummary.totalSKUs}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-red-500">Out of Stock</span>
                  <h3 className="text-xl font-bold font-display text-red-500">{inventorySummary.outOfStockCount}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-amber-500">Low Stock Alerts</span>
                  <h3 className="text-xl font-bold font-display text-amber-500">{inventorySummary.lowStockCount}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Stock Value</span>
                  <h3 className="text-xl font-bold font-display text-emerald-600">₹{inventorySummary.totalStockValue.toFixed(2)}</h3>
                </div>
              </div>
            )}

            {/* Alert banner */}
            {inventorySummary?.lowStockCount > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-3xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Low Inventory Refill Required</p>
                  <p className="text-[10px] opacity-80 mt-0.5">There are {inventorySummary.lowStockCount} items running low. Restock them below.</p>
                </div>
              </div>
            )}

            {/* Inventory table */}
            <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Product Catalog Stocking</h3>
                <button onClick={() => fetchInventory()} className="text-[11px] font-bold text-accent">↻ Refresh</button>
              </div>

              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3">Product Name</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">In Stock</th>
                        <th className="p-3">Sold</th>
                        <th className="p-3">Stock Value</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Quick Stock Addition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-650">
                      {inventoryList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                          <td className="p-3 font-bold text-slate-800 dark:text-white">{item.name}</td>
                          <td className="p-3 font-mono">{item.sku}</td>
                          <td className="p-3">{item.category}</td>
                          <td className={`p-3 font-bold ${item.isOutOfStock ? 'text-red-500' : item.isLowStock ? 'text-amber-500' : ''}`}>{item.currentStock}</td>
                          <td className="p-3">{item.totalSold}</td>
                          <td className="p-3">₹{item.stockValue.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.isOutOfStock ? 'bg-red-500/10 text-red-500' :
                              item.isLowStock ? 'bg-amber-500/10 text-amber-500' :
                              'bg-emerald-500/10 text-emerald-600'
                            }`}>{item.status}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <input 
                                type="number" 
                                placeholder="Qty" 
                                value={quickAddQty[item.id] || ''}
                                onChange={e => setQuickAddQty(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-16 px-2 py-1 border rounded-lg text-center bg-transparent outline-none focus:border-accent text-xs"
                              />
                              <button 
                                onClick={() => {
                                  const qty = parseInt(quickAddQty[item.id] || '0');
                                  if (qty > 0) {
                                    submitIncomingStock(item.id, qty, 'Quick stock adjustment from inventory controller');
                                    setQuickAddQty(prev => ({ ...prev, [item.id]: '' }));
                                  } else {
                                    showToast('Please enter a valid positive quantity', 'error');
                                  }
                                }}
                                className="px-2.5 py-1 bg-accent text-slate-900 rounded-lg font-bold text-[10px] shadow"
                              >
                                Add
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 10. DELIVERY PARTNER MANAGEMENT TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'delivery-partners' && (
          <div className="space-y-6 animate-splash">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold">Delivery Personnel Desk</p>
              <button 
                onClick={() => setIsAddingPartner(!isAddingPartner)} 
                className="px-4 py-2 bg-accent text-slate-900 font-bold rounded-xl flex items-center gap-1.5 shadow-md text-xs transition-all"
              >
                <Plus className="h-4 w-4" /> {isAddingPartner ? 'Show Partners List' : 'Register New Partner'}
              </button>
            </div>

            {isAddingPartner ? (
              /* ADD NEW PARTNER FORM */
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-md max-w-xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-4">Register Delivery Partner</h3>
                <form onSubmit={submitDeliveryPartner} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                  <div className="space-y-1">
                    <label htmlFor="partner-name" className="text-[10px] uppercase font-bold text-slate-400">Full Name *</label>
                    <input 
                      id="partner-name"
                      name="partnerName"
                      autoComplete="name"
                      type="text" required value={partnerName} onChange={e => setPartnerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="partner-phone" className="text-[10px] uppercase font-bold text-slate-400">Mobile Phone *</label>
                    <input 
                      id="partner-phone"
                      name="partnerPhone"
                      autoComplete="tel"
                      type="tel" required value={partnerPhone} onChange={e => setPartnerPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="partner-email" className="text-[10px] uppercase font-bold text-slate-400">Email Address (Optional)</label>
                    <input 
                      id="partner-email"
                      name="partnerEmail"
                      autoComplete="email"
                      type="email" value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="partner-vehicle" className="text-[10px] uppercase font-bold text-slate-400">Vehicle Description *</label>
                    <input 
                      id="partner-vehicle"
                      name="partnerVehicle"
                      autoComplete="off"
                      type="text" required placeholder="Hero Electric / TVS King / Auto" value={partnerVehicle} onChange={e => setPartnerVehicle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="partner-vehicle-number" className="text-[10px] uppercase font-bold text-slate-400">Vehicle Registration Number</label>
                    <input 
                      id="partner-vehicle-number"
                      name="partnerVehicleNumber"
                      autoComplete="off"
                      type="text" placeholder="AP 39 AB 1234" value={partnerVehicleNumber} onChange={e => setPartnerVehicleNumber(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="sm:col-span-2 py-3 bg-secondary text-white font-bold rounded-xl mt-4 hover:shadow-lg transition-all"
                  >
                    Save & Register Partner
                  </button>
                </form>
              </div>
            ) : (
              /* PARTNERS DIRECTORY */
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Active Logistical Fleet</h3>
                {deliveryPartnersLoading ? (
                  <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
                ) : deliveryPartnersList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-xs font-semibold">No delivery partners registered yet</p>
                    <p className="text-[10px] mt-1">Register drivers to assign orders manually.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-3">Driver Name</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Vehicle</th>
                          <th className="p-3">Rating</th>
                          <th className="p-3">Current Assignment</th>
                          <th className="p-3">Deliveries</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-650">
                        {deliveryPartnersList.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                            <td className="p-3 font-bold text-slate-800 dark:text-white">{p.name}</td>
                            <td className="p-3 font-mono">{p.phone}</td>
                            <td className="p-3">{p.vehicle} {p.vehicleNumber ? `(${p.vehicleNumber})` : ''}</td>
                            <td className="p-3 font-bold text-yellow-500 flex items-center gap-1">{p.rating} ⭐</td>
                            <td className="p-3 font-mono text-[10px] text-slate-500">
                              {p.currentOrderId ? (
                                <span className="text-accent font-bold">Active: #{p.currentOrderId.slice(4, 12)}</span>
                              ) : (
                                'Idle (Awaiting assignment)'
                              )}
                            </td>
                            <td className="p-3 font-bold">{p.completedDeliveries} completed</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                                {p.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={async () => {
                                  if (confirm(`Remove driver ${p.name}?`)) {
                                    await fetch(`/api/admin/delivery-partners?id=${p.id}`, { method: 'DELETE' });
                                    showToast('Partner removed', 'info');
                                    fetchDeliveryPartners();
                                  }
                                }}
                                className="p-1 hover:text-red-500"
                                title="Remove Driver"
                              >
                                <Trash2 className="h-4 w-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 11. REFUND MANAGEMENT TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'refunds' && (
          <div className="space-y-6 animate-splash">
            {/* Refunds Overview Card */}
            <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cancelled Order Refund Queue</h3>
                <button onClick={() => fetchRefunds()} className="text-[11px] font-bold text-accent">↻ Refresh</button>
              </div>

              <div className="space-y-2">
                <label htmlFor="refund-action-note" className="text-[10px] uppercase font-bold text-slate-400">Resolution Note (Shared with Customer)</label>
                <input 
                  id="refund-action-note"
                  name="refundActionNote"
                  autoComplete="off"
                  type="text" 
                  placeholder="e.g. Refunded back to UPI source wallet / COD cancellation approved"
                  value={refundActionNote}
                  onChange={e => setRefundActionNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2 text-xs font-semibold outline-none focus:border-accent"
                />
              </div>

              {refundsLoading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
              ) : refundsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-semibold">No refund requests in the queue</p>
                  <p className="text-[10px] mt-1">Paid online orders that get cancelled will flow here for admin clearance.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Order Value</th>
                        <th className="p-3">Refund Value</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Settlement Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-650">
                      {refundsList.map(r => (
                        <tr key={r.orderId} className="hover:bg-slate-50 dark:hover:bg-slate-950/20">
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-white">#{r.orderId.slice(4)}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800 dark:text-white">{r.customerName}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{r.customerPhone}</p>
                          </td>
                          <td className="p-3">{r.paymentMethod}</td>
                          <td className="p-3">₹{r.grandTotal.toFixed(2)}</td>
                          <td className="p-3 font-bold text-slate-850">₹{r.refundAmount.toFixed(2)}</td>
                          <td className="p-3 italic text-slate-500 truncate max-w-[150px]">{r.cancellationReason || 'Admin cancellation'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.refundStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                              r.refundStatus === 'Failed' ? 'bg-red-500/10 text-red-500' :
                              'bg-amber-500/10 text-amber-600'
                            }`}>{r.refundStatus}</span>
                          </td>
                          <td className="p-3 text-center">
                            {r.refundStatus === 'Pending' ? (
                              <div className="flex gap-2 justify-center">
                                <button 
                                  onClick={() => handleRefundAction(r.orderId, 'approve', r.refundAmount)}
                                  className="px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg font-bold text-[10px] shadow hover:bg-emerald-600 transition-colors"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRefundAction(r.orderId, 'reject')}
                                  className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg font-bold text-[10px] shadow hover:bg-red-600 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 12. CUSTOMER ACTIVITIES TAB */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-splash">
            <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real-Time User Operations Logs</h3>
                <div className="flex items-center gap-2">
                  <input 
                    id="activity-search-query"
                    name="activitySearchQuery"
                    autoComplete="off"
                    type="text" 
                    placeholder="Search by User ID..." 
                    value={activitySearchQuery} 
                    onChange={e => setActivitySearchQuery(e.target.value)}
                    className="text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:border-accent w-48"
                  />
                  <button 
                    onClick={() => fetchActivityLogs(activitySearchQuery, 1)}
                    className="px-3 py-1.5 bg-accent text-slate-900 font-bold rounded-xl text-[11px]"
                  >
                    Query
                  </button>
                  <button 
                    onClick={() => { setActivitySearchQuery(''); fetchActivityLogs('', 1); }}
                    className="px-3 py-1.5 border rounded-xl text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {activityLogsLoading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>
              ) : activityLogsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-semibold">No activity logs returned</p>
                  <p className="text-[10px] mt-1">Actions are logged in real-time as users browse, checkout, and authenticate.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {activityLogsList.map((log: any) => {
                      const icons: Record<string, string> = { 
                        login: '🔑', logout: '🚪', register: '📝', 
                        view_product: '👁️', add_to_cart: '🛒', remove_from_cart: '🗑️', 
                        wishlist_add: '❤️', wishlist_remove: '💔',
                        order_placed: '📦', payment: '💳', cancel_order: '🚫', download_invoice: '📄'
                      };
                      const colors: Record<string, string> = {
                        login: 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10',
                        logout: 'border-slate-350 bg-slate-50/50 dark:bg-slate-900/10',
                        register: 'border-purple-400 bg-purple-50/50 dark:bg-purple-900/10',
                        view_product: 'border-sky-400 bg-sky-50/50 dark:bg-sky-900/10',
                        add_to_cart: 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10',
                        remove_from_cart: 'border-orange-400 bg-orange-50/50 dark:bg-orange-900/10',
                        wishlist_add: 'border-pink-400 bg-pink-50/50 dark:bg-pink-900/10',
                        wishlist_remove: 'border-gray-400 bg-gray-50/50 dark:bg-gray-900/10',
                        order_placed: 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10',
                        payment: 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10',
                        cancel_order: 'border-red-400 bg-red-50/50 dark:bg-red-900/10',
                        download_invoice: 'border-teal-400 bg-teal-50/50 dark:bg-teal-900/10'
                      };
                      return (
                        <div key={log.id} className={`flex items-start justify-between gap-3 p-3 rounded-xl border-l-4 ${colors[log.type] || 'border-slate-300'} transition-all`}>
                          <div className="flex items-start gap-2.5">
                            <span className="text-base leading-none">{icons[log.type] || '●'}</span>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white capitalize text-[11px]">
                                {log.type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">User ID: {log.userId}</p>
                              {log.meta && Object.keys(log.meta).length > 0 && (
                                <div className="text-[9px] text-slate-500 font-mono mt-1 bg-slate-100 dark:bg-slate-950 p-1.5 rounded border">
                                  {Object.entries(log.meta).map(([k, v]) => (
                                    <span key={k} className="block">{k}: {String(v)}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination control */}
                  {activityLogsTotal > 25 && (
                    <div className="flex items-center justify-between pt-4 border-t text-xs font-semibold">
                      <button 
                        disabled={activityLogsPage <= 1} 
                        onClick={() => setActivityLogsPage(p => p - 1)}
                        className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-slate-500 font-mono">Page {activityLogsPage} of {Math.ceil(activityLogsTotal / 25)}</span>
                      <button 
                        disabled={activityLogsPage >= Math.ceil(activityLogsTotal / 25)} 
                        onClick={() => setActivityLogsPage(p => p + 1)}
                        className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 13. DATA EXPORT TAB PANEL */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'export' && (
          <div className="space-y-6 animate-splash">
            {/* Range Pickers */}
            <div className="bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Filter Parameters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                <div className="space-y-1">
                  <label htmlFor="export-date-from" className="text-[10px] uppercase font-bold text-slate-400">From Date</label>
                  <input 
                    id="export-date-from"
                    name="exportDateFrom"
                    type="date" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-2 outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="export-date-to" className="text-[10px] uppercase font-bold text-slate-400">To Date</label>
                  <input 
                    id="export-date-to"
                    name="exportDateTo"
                    type="date" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-2 outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Export options grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { type: 'orders', title: 'Orders Registry', desc: 'Lists every order, details, addresses, totals, dates.' },
                { type: 'customers', title: 'Customer Rolodex', desc: 'Active customers with orders count, registration date, wallet spends.' },
                { type: 'products', title: 'Products Catalog', desc: 'Current active pricing, brand names, discount rate parameters.' },
                { type: 'inventory', title: 'Inventory Levels', desc: 'Units in-stock, sold quantities, replenishment flows, stock value.' },
                { type: 'sales', title: 'Sales Revenues', desc: 'Revenue rollups, tax breakdowns, payment modes time-series.' },
                { type: 'refunds', title: 'Refund Log', desc: 'Resolutions database, cancellation reasoning, amounts refunded.' }
              ].map(card => {
                const getURL = (fmt: 'csv' | 'xlsx') => {
                  let path = `/api/admin/export?type=${card.type}&format=${fmt}`;
                  if (exportDateFrom) path += `&from=${exportDateFrom}`;
                  if (exportDateTo) path += `&to=${exportDateTo}`;
                  return path;
                };
                return (
                  <div key={card.type} className="bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">{card.title}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">{card.desc}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                      <a 
                        href={getURL('csv')}
                        download
                        className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 shadow-sm"
                      >
                        Download CSV
                      </a>
                      <a 
                        href={getURL('xlsx')}
                        download
                        className="py-2 bg-accent hover:bg-accent-light rounded-lg text-slate-900 shadow-sm"
                      >
                        Download Excel
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
