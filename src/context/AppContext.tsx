'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, LanguageType, TranslationKey } from '@/utils/translations';
import { Product, User, Order, Coupon, Address } from '@/db/db';

interface CartItem {
  product: Product;
  quantity: number;
}

export interface NotificationMsg {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push' | 'inapp';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface AppContextProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: TranslationKey) => string;
  
  // Auth
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserAvatar: (base64Avatar: string) => Promise<boolean>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<boolean>;
  removeAddress: (id: string) => Promise<boolean>;
  
  // Products
  products: Product[];
  refreshProducts: () => Promise<void>;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  
  // Coupon
  appliedCoupon: Coupon | null;
  applyCouponCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  
  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  
  // Compare
  compareList: Product[];
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
  
  // Orders
  orders: Order[];
  createOrder: (orderData: {
    items: { productId: string; sku: string; name: string; price: number; quantity: number; gst: number }[];
    subtotal: number;
    gstTotal: number;
    deliveryCharges: number;
    discount: number;
    grandTotal: number;
    paymentMethod: string;
    deliveryAddress: Omit<Address, 'id' | 'isDefault'>;
    giftMessage?: string;
    deliveryInstructions?: string;
  }) => Promise<{ success: boolean; orderId?: string }>;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
  
  // Toast & Notifications
  notifications: NotificationMsg[];
  addNotification: (type: NotificationMsg['type'], title: string, message: string) => void;
  markAllNotificationsRead: () => void;
  toast: { message: string; type: 'success' | 'error' | 'info' | null };
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguageState] = useState<LanguageType>('en');
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  // Load state on mount
  useEffect(() => {
    // Initialize application (database indexes, caching, etc.)
    const initApp = async () => {
      try {
        await fetch('/api/init', { method: 'GET' });
      } catch (error) {
        console.error('App initialization error (non-blocking):', error);
      }
    };
    initApp();

    // Theme
    const storedTheme = localStorage.getItem('reddy-theme') as 'light' | 'dark';
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', prefersDark);
    }

    // Language
    const storedLang = localStorage.getItem('reddy-lang') as LanguageType;
    if (storedLang) setLanguageState(storedLang);

    // Cart
    const storedCart = localStorage.getItem('reddy-cart');
    if (storedCart) setCart(JSON.parse(storedCart));

    // Wishlist
    const storedWishlist = localStorage.getItem('reddy-wishlist');
    if (storedWishlist) setWishlist(JSON.parse(storedWishlist));

    // Load initial products
    fetchProducts();
    
    // Check if user is logged in
    const storedUser = localStorage.getItem('reddy-user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchOrders(parsedUser.id, parsedUser.role);
    }
  }, []);

  // Sync Cart
  useEffect(() => {
    localStorage.setItem('reddy-cart', JSON.stringify(cart));
  }, [cart]);

  // Sync Wishlist
  useEffect(() => {
    localStorage.setItem('reddy-wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Theme Toggler
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('reddy-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    showToast(`Switched to ${nextTheme} mode`, 'info');
  };

  // Language Setter
  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem('reddy-lang', lang);
    showToast(lang === 'en' ? 'Language changed to English' : 'భాష తెలుగులోకి మార్చబడింది', 'info');
  };

  // Translation function
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || String(key);
  };

  // Show Toast Alert
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: null });
    }, 3000);
  };

  // Add Notification System (Logs simulation as well)
  const addNotification = (type: NotificationMsg['type'], title: string, message: string) => {
    const newNotif: NotificationMsg = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Simulated messaging logs to console
    console.log(`[SIMULATED ${type.toUpperCase()} NOTIFICATION]`);
    console.log(`To: ${user?.phone || 'Customer'}`);
    console.log(`Title: ${title}`);
    console.log(`Message: ${message}`);
    console.log(`-----------------------------------`);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Fetch Products from Database API
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const refreshProducts = async () => {
    await fetchProducts();
  };

  // Fetch Orders from Database API
  const fetchOrders = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/orders?userId=${userId}&role=${role}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const refreshOrders = async () => {
    if (user) {
      await fetchOrders(user.id, user.role);
    }
  };

  // Auth Operations
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('reddy-user', JSON.stringify(data.user));
        fetchOrders(data.user.id, data.user.role);
        addNotification('inapp', 'Login Successful', `Welcome back, ${data.user.name}!`);
        addNotification('email', 'Login Notification', `Hello ${data.user.name}, you have successfully signed into REDDY PREMIUM DAIRY.`);
        showToast(`Logged in as ${data.user.name}`, 'success');
        return { success: true };
      } else {
        showToast(data.message || 'Login failed', 'error');
        return { success: false, error: data.message };
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('An error occurred during login', 'error');
      return { success: false, error: 'Connection error' };
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Registration successful! Please login.', 'success');
        // Simulated SMS Verification OTP
        addNotification('sms', 'OTP Verification', `Your OTP for registering at REDDY PREMIUM DAIRY is 5812. Valid for 5 minutes.`);
        return { success: true };
      } else {
        showToast(data.message || 'Registration failed', 'error');
        return { success: false, error: data.message };
      }
    } catch (err) {
      console.error('Registration error:', err);
      showToast('An error occurred during registration', 'error');
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = () => {
    setUser(null);
    setOrders([]);
    localStorage.removeItem('reddy-user');
    showToast('Logged out successfully', 'success');
  };

  const updateUserAvatar = async (base64Avatar: string) => {
    if (!user) return false;
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, avatar: base64Avatar })
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, avatar: base64Avatar };
        setUser(updated);
        localStorage.setItem('reddy-user', JSON.stringify(updated));
        showToast('Profile image updated', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const addAddress = async (newAddress: Omit<Address, 'id'>) => {
    if (!user) return false;
    const addressId = `addr-${Date.now()}`;
    const fullAddress: Address = { ...newAddress, id: addressId };
    
    // Default setting
    let updatedAddresses = [...user.addresses];
    if (newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
    }
    updatedAddresses.push(fullAddress);

    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, addresses: updatedAddresses })
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, addresses: updatedAddresses };
        setUser(updated);
        localStorage.setItem('reddy-user', JSON.stringify(updated));
        showToast('Address added successfully', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const removeAddress = async (id: string) => {
    if (!user) return false;
    const updatedAddresses = user.addresses.filter(addr => addr.id !== id);
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, addresses: updatedAddresses })
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, addresses: updatedAddresses };
        setUser(updated);
        localStorage.setItem('reddy-user', JSON.stringify(updated));
        showToast('Address removed', 'info');
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Cart Operations
  const addToCart = (product: Product, qty: number = 1) => {
    setCart(prev => {
      const exists = prev.find(item => item.product.id === product.id);
      if (exists) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + qty, product.stock) }
            : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    showToast(`${product.name} added to cart`, 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('Product removed from cart', 'info');
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(qty, item.product.stock) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  // Coupons
  const applyCouponCode = async (code: string) => {
    try {
      const res = await fetch(`/api/coupons?code=${code}`);
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data.coupon);
        showToast(`Coupon ${code} applied successfully!`, 'success');
        return { success: true, message: data.message };
      } else {
        showToast(data.message || 'Invalid coupon', 'error');
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Server error applying coupon' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  };

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const isStarred = prev.includes(productId);
      if (isStarred) {
        showToast('Removed from wishlist', 'info');
        return prev.filter(id => id !== productId);
      } else {
        showToast('Added to wishlist', 'success');
        return [...prev, productId];
      }
    });
  };

  // Compare List
  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        showToast('Removed from comparison list', 'info');
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 3) {
        showToast('You can compare a maximum of 3 products at a time.', 'error');
        return prev;
      }
      showToast('Added to comparison list', 'success');
      return [...prev, product];
    });
  };

  const clearCompare = () => {
    setCompareList([]);
    showToast('Comparison list cleared', 'info');
  };

  // Orders
  const createOrder = async (orderData: {
    items: { productId: string; sku: string; name: string; price: number; quantity: number; gst: number }[];
    subtotal: number;
    gstTotal: number;
    deliveryCharges: number;
    discount: number;
    grandTotal: number;
    paymentMethod: string;
    deliveryAddress: Omit<Address, 'id' | 'isDefault'>;
    giftMessage?: string;
    deliveryInstructions?: string;
  }) => {
    const finalUserId = user ? user.id : 'user-guest';
    const finalOrder = {
      ...orderData,
      userId: finalUserId
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalOrder)
      });
      const data = await res.json();
      if (data.success) {
        clearCart();
        refreshProducts(); // Refresh stock counts
        
        if (user) {
          // Add reward points (10% of order subtotal)
          const pointsEarned = Math.floor(orderData.subtotal * 0.1);
          const updatedPoints = user.rewardPoints + pointsEarned;
          
          // Deduct from wallet if wallet balance was used (UPI / Card checkout simulation)
          const updatedUser = { ...user, rewardPoints: updatedPoints };
          setUser(updatedUser);
          localStorage.setItem('reddy-user', JSON.stringify(updatedUser));
          
          // Sync with database auth update
          await fetch('/api/auth/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, rewardPoints: updatedPoints })
          });
          
          fetchOrders(user.id, user.role);
          
          addNotification('inapp', 'Order Placed', `Order #${data.order.id} has been placed successfully.`);
          addNotification('sms', 'Order Confirmed', `Thank you for ordering at REDDY PREMIUM DAIRY! Your Order #${data.order.id} is confirmed. Amt: Rs. ${data.order.grandTotal.toFixed(2)}.`);
          addNotification('whatsapp', 'Order Details', `Hello ${user.name}, your order #${data.order.id} has been successfully placed. Live tracking link: http://reddypremiumdairy.com/orders/${data.order.id}`);
          addNotification('email', 'Order Invoice', `Dear Customer, please find attached the professional invoice for your order #${data.order.id}.`);
        }
        
        showToast('Order placed successfully!', 'success');
        return { success: true, orderId: data.order.id };
      }
      return { success: false };
    } catch (err) {
      console.error(err);
      showToast('Error processing order', 'error');
      return { success: false };
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });
      const data = await res.json();
      if (data.success) {
        if (user) {
          await fetchOrders(user.id, user.role);
          addNotification('inapp', 'Order Updated', `Order #${orderId} status changed to ${status}.`);
          addNotification('sms', 'Order Status Update', `Your Reddy Premium Dairy Order #${orderId} is now ${status}.`);
        }
        showToast(`Order status updated to ${status}`, 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        language,
        setLanguage,
        t,
        user,
        login,
        register,
        logout,
        updateUserAvatar,
        addAddress,
        removeAddress,
        products,
        refreshProducts,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        appliedCoupon,
        applyCouponCode,
        removeCoupon,
        wishlist,
        toggleWishlist,
        compareList,
        toggleCompare,
        clearCompare,
        orders,
        createOrder,
        refreshOrders,
        updateOrderStatus,
        notifications,
        addNotification,
        markAllNotificationsRead,
        toast,
        showToast
      }}
    >
      {children}
      
      {/* Dynamic Toast Alert UI */}
      {toast.message && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center justify-between gap-4 rounded-xl border border-white/20 px-6 py-4 shadow-2xl glass-premium transition-all duration-300 animate-splash">
          <div className="flex items-center gap-3">
            {toast.type === 'success' && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                ✓
              </span>
            )}
            {toast.type === 'error' && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                ✕
              </span>
            )}
            {toast.type === 'info' && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                ℹ
              </span>
            )}
            <p className="text-sm font-semibold tracking-wide text-primary dark:text-white">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast({ message: '', type: null })}
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
