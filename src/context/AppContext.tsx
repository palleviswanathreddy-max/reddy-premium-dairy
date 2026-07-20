'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { translations, LanguageType, TranslationKey } from '@/utils/translations';
import { Product, User, Order, Coupon, Address } from '@/db/db';
import { useSession, signOut, signIn } from 'next-auth/react';

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

// Type definitions for Central Constants & Types
export type OrderStatus =
  | 'Delivered'
  | 'Paid'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Pending'
  | 'Cancelled'
  | 'Returned'
  | 'Failed'
  | 'Refunded';

// Central API Routes Constants
const API_PRODUCTS = '/api/products';
const API_ORDERS = '/api/orders';
const API_CART = '/api/cart';
const API_WISHLIST = '/api/wishlist';
const API_NOTIFICATIONS = '/api/notifications';
const API_INIT = '/api/init';
const API_AUTH_SYNC = '/api/auth/google-sync';
const API_PROFILE = '/api/profile';
const API_AUTH_LOGIN = '/api/auth/login';
const API_AUTH_REGISTER = '/api/auth/register';
const API_AUTH_UPDATE = '/api/auth/update';
const API_FCM_TOKEN = '/api/user/fcm-token';
const API_COUPONS = '/api/coupons';
const API_ORDERS_UPDATE = '/api/orders/update';
const API_TRACK_CART = '/api/track/cart';
const API_TRACK_PURCHASE = '/api/track/purchase';

// Safe LocalStorage Utility Wrapper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('localStorage setItem failed:', err);
      }
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('localStorage removeItem failed:', err);
      }
    }
  }
};

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
  isCartLoaded: boolean;
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
  updateOrderStatus: (orderId: string, status: OrderStatus | string) => Promise<boolean>;

  // Toast & Notifications
  notifications: NotificationMsg[];
  addNotification: (type: NotificationMsg['type'], title: string, message: string) => void;
  markAllNotificationsRead: () => void;
  toast: { message: string; type: 'success' | 'error' | 'info' | null };
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguageState] = useState<LanguageType>('en');

  // Hydration safety: sync theme & language from localStorage on mount
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedTheme = safeLocalStorage.getItem('reddy-theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }

    const storedLang = safeLocalStorage.getItem('reddy-lang') as LanguageType | null;
    if (storedLang) {
      setLanguageState(storedLang);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const lastSyncedCartRef = useRef<string>('');
  const lastSyncedWishlistRef = useRef<string>('');

  // Show Toast Alert
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: null });
    }, 3000);
  }, []);

  // Activity Tracking (Fire-and-forget helper)
  const trackEvent = useCallback((endpoint: string, payload: Record<string, unknown>) => {
    const fire = () => {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Silent tracking failed (expected in some mock scopes):', err);
        }
      });
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(fire);
    } else {
      setTimeout(fire, 0);
    }
  }, []);

  // Apply theme class to HTML element whenever theme state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Fetch Products from Database API
  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(API_PRODUCTS, { signal });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch products:', error);
      }
    }
  }, []);

  // Fetch Orders from Database API
  const fetchOrders = useCallback(async (userId: string, role: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_ORDERS}?userId=${userId}&role=${role}`, { cache: 'no-store', signal });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch orders:', error);
      }
    }
  }, []);

  // Fetch Notifications from Database
  const fetchNotifications = useCallback(async (userId: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_NOTIFICATIONS}?userId=${userId}`, { cache: 'no-store', signal });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const msgs = data.notifications.map((n: { id: string; type: string; title: string; message: string; createdAt: string; isRead: boolean }) => ({
          id: n.id,
          type: n.type === 'email' || n.type === 'sms' || n.type === 'whatsapp' ? n.type : 'inapp',
          title: n.title,
          message: n.message,
          time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: n.isRead
        }));
        setNotifications(msgs);
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch notifications:', error);
      }
    }
  }, []);

  // Fetch cart & wishlist from database
  const fetchCartAndWishlist = useCallback(async (userId: string, signal?: AbortSignal) => {
    try {
      const cartRes = await fetch(`${API_CART}?userId=${userId}`, { cache: 'no-store', signal });
      if (!cartRes.ok) throw new Error(`HTTP error! status: ${cartRes.status}`);
      const cartData = await cartRes.json();
      let dbCart = cartData.success ? cartData.cart : [];

      // Check for guest cart merge
      const guestCartStr = safeLocalStorage.getItem('reddy-guest-cart');
      if (guestCartStr && userId) {
        try {
          const guestCart = JSON.parse(guestCartStr);
          if (guestCart && guestCart.length > 0) {
            const mergedCart = [...dbCart];
            for (const guestItem of guestCart) {
              const idx = mergedCart.findIndex(item => item.product.id === guestItem.product.id);
              if (idx > -1) {
                mergedCart[idx].quantity += guestItem.quantity;
              } else {
                mergedCart.push(guestItem);
              }
            }
            dbCart = mergedCart;
            // Sync merged cart to DB
            const cartPayload = mergedCart.map(item => ({
              productId: item.product.id,
              quantity: item.quantity
            }));
            const mergeRes = await fetch(API_CART, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, cart: cartPayload }),
              signal
            });
            if (!mergeRes.ok) throw new Error(`HTTP error! status: ${mergeRes.status}`);
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to merge guest cart:', e);
          }
        } finally {
          safeLocalStorage.removeItem('reddy-guest-cart');
        }
      }

      setCart(dbCart);
      lastSyncedCartRef.current = JSON.stringify(dbCart.map((item: CartItem) => ({
        productId: item.product.id,
        quantity: item.quantity
      })));
      setIsCartLoaded(true);

      try {
        const wishlistRes = await fetch(`${API_WISHLIST}?userId=${userId}`, { cache: 'no-store', signal });
        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json();
          if (wishlistData.success) {
            setWishlist(wishlistData.wishlist);
            lastSyncedWishlistRef.current = JSON.stringify(wishlistData.wishlist);
          }
        }
      } catch (wishlistErr) {
        const wErr = wishlistErr as Error;
        if (wErr.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch wishlist:', wishlistErr);
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch cart/wishlist:', error);
      }
    }
  }, []);

  // Sync Google/Credentials user profiles safely from PostgreSQL
  const syncSessionProfile = useCallback(async (syncUrl: string, isGoogleProvider: boolean, signal?: AbortSignal) => {
    try {
      const res = await fetch(syncUrl, { signal });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        safeLocalStorage.setItem('reddy-user', JSON.stringify(data.user));
        
        // Fetch all relational collections
        fetchOrders(data.user.id, data.user.role, signal);
        fetchCartAndWishlist(data.user.id, signal);
        fetchNotifications(data.user.id, signal);

        if (isGoogleProvider) {
          showToast(`Logged in as ${data.user.name}`, 'success');
          trackEvent(API_TRACK_CART, { userId: data.user.id, type: 'login' });
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.error('Session sync failed:', data.message);
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('Error syncing session:', error);
      }
    }
  }, [fetchOrders, fetchCartAndWishlist, fetchNotifications, showToast, trackEvent]);

  // Load state on mount
  useEffect(() => {
    const controller = new AbortController();
    const initApp = async () => {
      try {
        const res = await fetch(API_INIT, { method: 'GET', signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      } catch (error) {
        const err = error as Error;
        if (err.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
          console.error('App initialization error (non-blocking):', err);
        }
      }
    };
    initApp();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchProducts]);

  // Sync NextAuth session changes dynamically
  useEffect(() => {
    const controller = new AbortController();
    
    if (status === 'loading') return;

    if (status === 'authenticated') {
      const isGoogleProvider = !!(session?.user && !session.user.image?.startsWith('data:'));
      const syncUrl = isGoogleProvider ? API_AUTH_SYNC : API_PROFILE;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      syncSessionProfile(syncUrl, isGoogleProvider, controller.signal);
    } else if (status === 'unauthenticated') {
      setUser(null);
      safeLocalStorage.removeItem('reddy-user');
      lastSyncedCartRef.current = '';
      lastSyncedWishlistRef.current = '';

      // Restores guest cart on unauthenticated/logout states
      const localCart = safeLocalStorage.getItem('reddy-guest-cart');
      if (localCart) {
        try {
          setCart(JSON.parse(localCart));
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error parsing local cart:', e);
          }
        }
      }
      setIsCartLoaded(true);
    }

    return () => {
      controller.abort();
    };
  }, [status, session, syncSessionProfile]);

  // Live Order & Notification Updates via Server-Sent Events (SSE)
  const sseUserId = user?.id;
  const sseUserRole = user?.role;

  useEffect(() => {
    if (!sseUserId) return;

    const eventSource = new EventSource(`/api/events?userId=${sseUserId}`);

    const handleSSEMessage = () => {
      fetchOrders(sseUserId, sseUserRole || '');
      fetchNotifications(sseUserId);
    };

    eventSource.addEventListener('order_created', handleSSEMessage);
    eventSource.addEventListener('order_updated', handleSSEMessage);
    eventSource.addEventListener('notification_created', handleSSEMessage);
    eventSource.onmessage = handleSSEMessage;

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sseUserId, sseUserRole, fetchOrders, fetchNotifications]);

  // Register Firebase Cloud Messaging (FCM) Token
  const registerFCMToken = useCallback(async (userId: string, signal?: AbortSignal) => {
    try {
      const { requestForToken } = await import('@/lib/firebase');
      const token = await requestForToken();
      if (token) {
        const res = await fetch(API_FCM_TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, token }),
          signal
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        if (process.env.NODE_ENV === 'development') {
          console.log('FCM Token registered with server successfully.');
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('FCM Token registration skipped/failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (user?.id) {
      registerFCMToken(user.id, controller.signal);
    }
    return () => {
      controller.abort();
    };
  }, [user?.id, registerFCMToken]);

  // Sync Cart to database (debounced to group rapid updates and handle Strict Mode)
  useEffect(() => {
    if (!isCartLoaded) return;

    const cartPayload = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));
    const cartString = JSON.stringify(cartPayload);

    // Skip if cart data hasn't changed
    if (lastSyncedCartRef.current === cartString) {
      return;
    }

    if (!user) {
      safeLocalStorage.setItem('reddy-guest-cart', JSON.stringify(cart));
      lastSyncedCartRef.current = cartString;
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(API_CART, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, cart: cartPayload }),
          signal: controller.signal
        });
        if (res.ok) {
          lastSyncedCartRef.current = cartString;
        } else if (process.env.NODE_ENV === 'development') {
          console.error('Failed to sync cart:', res.statusText);
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
          console.error('Failed to sync cart to db:', error);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [cart, user, isCartLoaded]);

  // Sync Wishlist to database (debounced to group rapid updates and handle Strict Mode)
  useEffect(() => {
    if (!user) return;

    const wishlistString = JSON.stringify(wishlist);
    // Skip if wishlist data hasn't changed
    if (lastSyncedWishlistRef.current === wishlistString) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(API_WISHLIST, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, wishlist }),
          signal: controller.signal
        });
        if (res.ok) {
          lastSyncedWishlistRef.current = wishlistString;
        } else if (process.env.NODE_ENV === 'development') {
          console.error('Failed to sync wishlist:', res.statusText);
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
          console.error('Failed to sync wishlist to db:', error);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [wishlist, user]);

  // Theme Toggler
  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    safeLocalStorage.setItem('reddy-theme', nextTheme);
    showToast(`Switched to ${nextTheme} mode`, 'info');
  }, [theme, showToast]);

  // Language Setter
  const setLanguage = useCallback((lang: LanguageType) => {
    setLanguageState(lang);
    safeLocalStorage.setItem('reddy-lang', lang);
    showToast(lang === 'en' ? 'Language changed to English' : 'భాష తెలుగులోకి మార్చబడింది', 'info');
  }, [showToast]);

  // Translation function
  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || String(key);
  }, [language]);

  // Add Notification System
  const addNotification = useCallback(async (type: NotificationMsg['type'], title: string, message: string) => {
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SIMULATED ${type.toUpperCase()} NOTIFICATION]`);
        console.log(`To: Customer (Guest)`);
        console.log(`Title: ${title}`);
        console.log(`Message: ${message}`);
        console.log(`-----------------------------------`);
      }
      return;
    }
    const userId = user.id;
    try {
      const res = await fetch(API_NOTIFICATIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          message,
          type: type === 'email' || type === 'sms' || type === 'whatsapp' ? type : 'inapp'
        })
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await fetchNotifications(userId);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SIMULATED ${type.toUpperCase()} NOTIFICATION]`);
      console.log(`To: ${user?.phone || 'Customer'}`);
      console.log(`Title: ${title}`);
      console.log(`Message: ${message}`);
      console.log(`-----------------------------------`);
    }
  }, [user, fetchNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (user) {
      try {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        await Promise.all(unreadIds.map(id =>
          fetch(API_NOTIFICATIONS, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: id })
          }).then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          })
        ));
        await fetchNotifications(user.id);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error(err);
        }
      }
    }
  }, [user, notifications, fetchNotifications]);

  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  const refreshOrders = useCallback(async () => {
    if (user) {
      await fetchOrders(user.id, user.role);
    }
  }, [user, fetchOrders]);

  // Auth Operations: Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const loginRes = await fetch(API_AUTH_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password })
      });
      if (!loginRes.ok) throw new Error(`HTTP error! status: ${loginRes.status}`);
      const loginData = await loginRes.json();

      if (!loginData.success) {
        showToast(loginData.message || 'Login failed', 'error');
        return { success: false, error: loginData.message };
      }

      const result = await signIn('credentials', {
        redirect: false,
        identifier: email,
        password
      });

      if (result?.error) {
        showToast(result.error || 'Login failed', 'error');
        return { success: false, error: result.error };
      }

      const res = await fetch(API_PROFILE);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        safeLocalStorage.setItem('reddy-user', JSON.stringify(data.user));
        
        fetchOrders(data.user.id, data.user.role);
        fetchCartAndWishlist(data.user.id);
        fetchNotifications(data.user.id);
        
        addNotification('inapp', 'Login Successful', `Welcome back, ${data.user.name}!`);
        addNotification('email', 'Login Notification', `Hello ${data.user.name}, you have successfully signed into REDDY PREMIUM DAIRY.`);
        showToast(`Logged in as ${data.user.name}`, 'success');
        trackEvent(API_TRACK_CART, { userId: data.user.id, type: 'login' });
        return { success: true };
      } else {
        showToast('Failed to retrieve user profile', 'error');
        return { success: false, error: 'Failed to retrieve profile' };
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', err);
      }
      showToast('An error occurred during login', 'error');
      return { success: false, error: 'Connection error' };
    }
  }, [fetchOrders, fetchCartAndWishlist, fetchNotifications, addNotification, showToast, trackEvent]);

  // Auth Operations: Register
  const register = useCallback(async (name: string, email: string, phone: string, password: string) => {
    try {
      const res = await fetch(API_AUTH_REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        showToast('Registration successful! Please login.', 'success');
        addNotification('sms', 'OTP Verification', `Your OTP for registering at REDDY PREMIUM DAIRY is 5812. Valid for 5 minutes.`);
        return { success: true };
      } else {
        showToast(data.message || 'Registration failed', 'error');
        return { success: false, error: data.message };
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Registration error:', err);
      }
      showToast('An error occurred during registration', 'error');
      return { success: false, error: 'Connection error' };
    }
  }, [addNotification, showToast]);

  // Auth Operations: Logout
  const logout = useCallback(() => {
    signOut({ redirect: false });
    setUser(null);
    setOrders([]);
    setCart([]);
    setWishlist([]);
    setNotifications([]);
    safeLocalStorage.removeItem('reddy-user');
    safeLocalStorage.removeItem('reddy-guest-cart');
    showToast('Logged out successfully', 'success');
  }, [showToast]);

  // Auth Operations: Update Avatar
  const updateUserAvatar = useCallback(async (base64Avatar: string) => {
    if (!user) return false;
    try {
      const res = await fetch(API_AUTH_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, avatar: base64Avatar })
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, avatar: base64Avatar };
        setUser(updated);
        safeLocalStorage.setItem('reddy-user', JSON.stringify(updated));
        showToast('Profile image updated', 'success');
        return true;
      }
      return false;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
      return false;
    }
  }, [user, showToast]);

  // Auth Operations: Add Address
  const addAddress = useCallback(async (newAddress: Omit<Address, 'id'>) => {
    if (!user) return false;
    const addressId = `addr-${Date.now()}`;
    const fullAddress: Address = { ...newAddress, id: addressId };

    let updatedAddresses = [...user.addresses];
    if (newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
    }
    updatedAddresses.push(fullAddress);

    try {
      const res = await fetch(API_AUTH_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, addresses: updatedAddresses })
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, addresses: updatedAddresses };
        setUser(updated);
        safeLocalStorage.setItem('reddy-user', JSON.stringify(updated));
        showToast('Address added successfully', 'success');
        return true;
      }
      return false;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
      return false;
    }
  }, [user, showToast]);

  // Auth Operations: Remove Address
  const removeAddress = useCallback(async (id: string) => {
    if (!user) return false;
    const updatedAddresses = user.addresses.filter(addr => addr.id !== id);
    try {
      const res = await fetch(API_AUTH_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, addresses: updatedAddresses })
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, addresses: updatedAddresses };
        setUser(updated);
        safeLocalStorage.setItem('reddy-user', JSON.stringify(updated));
        showToast('Address removed', 'info');
        return true;
      }
      return false;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
      return false;
    }
  }, [user, showToast]);

  // Cart: Add to Cart
  const addToCart = useCallback((product: Product, qty: number = 1) => {
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
    const userId = user?.id || `guest_${Date.now()}`;
    trackEvent(API_TRACK_CART, { userId, type: 'cart_add', productId: product.id, productName: product.name, quantity: qty });
  }, [user, showToast, trackEvent]);

  // Cart: Remove from Cart
  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('Product removed from cart', 'info');
  }, [showToast]);

  // Cart: Update Quantity
  const updateCartQty = useCallback((productId: string, qty: number) => {
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
  }, [removeFromCart]);

  // Cart: Clear Cart
  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  // Coupon: Apply Coupon Code
  const applyCouponCode = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API_COUPONS}?code=${code}`);
      let data: { success?: boolean; coupon?: Coupon | null; message?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Safe check if json parse fails
      }

      if (!res.ok) {
        const errorMsg = data?.message || `HTTP error! status: ${res.status}`;
        showToast(errorMsg, 'error');
        return { success: false, message: errorMsg };
      }

      if (data && data.success) {
        setAppliedCoupon(data.coupon || null);
        showToast(`Coupon ${code.toUpperCase()} applied successfully!`, 'success');
        return { success: true, message: data.message || 'Coupon applied successfully!' };
      } else {
        const errorMsg = data?.message || 'Invalid coupon';
        showToast(errorMsg, 'error');
        return { success: false, message: errorMsg };
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
      return { success: false, message: 'Server error applying coupon' };
    }
  }, [showToast]);

  // Coupon: Remove Coupon
  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  }, [showToast]);

  // Wishlist: Toggle Wishlist item
  const toggleWishlist = useCallback((productId: string) => {
    if (!user) {
      showToast('Please login to use the wishlist', 'error');
      return;
    }
    setWishlist(prev => {
      const isStarred = prev.includes(productId);
      if (isStarred) {
        showToast('Removed from wishlist', 'info');
        return prev.filter(id => id !== productId);
      } else {
        showToast('Added to wishlist', 'success');
        const userId = user.id;
        const product = products.find(p => p.id === productId);
        trackEvent(API_TRACK_CART, { userId, type: 'wishlist_add', productId, productName: product?.name || null });
        return [...prev, productId];
      }
    });
  }, [user, products, showToast, trackEvent]);

  // Compare List: Toggle Compare item
  const toggleCompare = useCallback((product: Product) => {
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
  }, [showToast]);

  // Compare List: Clear Compare list
  const clearCompare = useCallback(() => {
    setCompareList([]);
    showToast('Comparison list cleared', 'info');
  }, [showToast]);

  // Orders: Create Order
  const createOrder = useCallback(async (orderData: {
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
    if (!user) {
      showToast('Please login to place an order', 'error');
      return { success: false, error: 'Unauthorized' };
    }
    const finalUserId = user.id;
    const finalOrder = {
      ...orderData,
      userId: finalUserId
    };

    try {
      const res = await fetch(API_ORDERS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalOrder)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        clearCart();
        refreshProducts();

        const pointsEarned = Math.floor(orderData.subtotal * 0.1);
        const updatedPoints = user.rewardPoints + pointsEarned;

        const updatedUser = { ...user, rewardPoints: updatedPoints };
        setUser(updatedUser);
        safeLocalStorage.setItem('reddy-user', JSON.stringify(updatedUser));

        await fetch(API_AUTH_UPDATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, rewardPoints: updatedPoints })
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        });

        fetchOrders(user.id, user.role);

        addNotification('inapp', 'Order Placed', `Order #${data.order.id} has been placed successfully.`);
        addNotification('sms', 'Order Confirmed', `Thank you for ordering at REDDY PREMIUM DAIRY! Your Order #${data.order.id} is confirmed. Amt: Rs. ${data.order.grandTotal.toFixed(2)}.`);
        addNotification('whatsapp', 'Order Details', `Hello ${user.name}, your order #${data.order.id} has been successfully placed. Live tracking link: http://reddypremiumdairy.com/orders/${data.order.id}`);
        addNotification('email', 'Order Invoice', `Dear Customer, please find attached the professional invoice for your order #${data.order.id}.`);

        showToast('Order placed successfully!', 'success');
        trackEvent(API_TRACK_PURCHASE, {
          userId: finalUserId,
          orderId: data.order.id,
          items: orderData.items.map(i => ({ productId: i.productId, productName: i.name, quantity: i.quantity, price: i.price })),
          grandTotal: orderData.grandTotal
        });
        return { success: true, orderId: data.order.id };
      }
      return { success: false };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
      showToast('Error processing order', 'error');
      return { success: false };
    }
  }, [user, clearCart, refreshProducts, fetchOrders, addNotification, showToast, trackEvent]);

  // Orders: Update Order Status
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus | string) => {
    try {
      const res = await fetch(API_ORDERS_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
      if (process.env.NODE_ENV === 'development') {
        console.error(err);
      }
      return false;
    }
  }, [user, fetchOrders, addNotification, showToast]);

  const contextValue = useMemo<AppContextProps>(() => ({
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
    isCartLoaded,
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
  }), [
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
    isCartLoaded,
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
  ]);

  return (
    <AppContext.Provider value={contextValue}>
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
