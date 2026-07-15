import fs from 'fs';
import path from 'path';

// Define DB Path
const DB_PATH = path.join(process.cwd(), 'src', 'db', 'localdb.json');

// Interface definitions
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  ingredients: string;
  storage: string;
  nutrition: {
    calories: string;
    fat: string;
    saturatedFat?: string;
    protein: string;
    carbohydrates: string;
    calcium?: string;
    vitaminD?: string;
    sodium?: string;
  };
  weight: string;
  volume: string;
  mrp: number;
  price: number;
  discount: number;
  gst: number;
  stock: number;
  status: string;
  expiryDays: number;
  deliveryTime: string;
  rating: number;
  images: string[];
  tags: string[];
  reviews: Array<{
    username: string;
    rating: number;
    date: string;
    comment: string;
    photo: string | null;
  }>;
  faq?: Array<{ q: string; a: string }>;
  frequentlyBoughtTogether: string[];
  relatedProducts: string[];
  variants?: Array<{
    id: string;
    label: string;
    price: number;
    mrp: number;
    stock: number;
  }>;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  village?: string;
  city?: string;
  mandal?: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  passwordHash?: string;
  name: string;
  role: 'admin' | 'customer';
  phone: string;
  avatar: string | null;
  addresses: Address[];
  rewardPoints: number;
  walletBalance: number;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  deletedAt?: string | null;
  fcmToken?: string | null;
  biometricsEnabled?: boolean;
  biometricCredentialId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'Order Updates' | 'Payment Status' | 'Offers' | 'Coupons' | 'Admin Messages';
  isRead: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  gst: number;
}

export interface OrderTimeline {
  status: string;
  time: string;
  done: boolean;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  gstTotal: number;
  deliveryCharges: number;
  discount: number;
  grandTotal: number;
  status: 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Returned' | 'Refund' | 'Exchange';
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  deliveryAddress: Omit<Address, 'id' | 'isDefault'>;
  createdAt: string;
  timeline: OrderTimeline[];
  deliverySlot?: string;
  giftMessage?: string;
  deliveryInstructions?: string;
  deliveryOtp?: string;
  expectedDelivery?: string;
  deliveredAt?: string;
  deliveryPartner?: {
    name: string;
    phone: string;
    vehicle: string;
    locationUrl?: string;
    lat?: number;
    lng?: number;
    destLat?: number;
    destLng?: number;
    eta?: string;
  };
  cancellationReason?: string;
  refundStatus?: 'Pending' | 'Completed' | 'Failed';
  refundAmount?: number;
  subscriptionType?: 'One Time Order' | 'Daily Subscription';
  invoiceNumber?: string;
}

export interface Coupon {
  id?: string;
  code: string;
  description: string;
  type: 'flat' | 'percentage' | 'free_shipping';
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  expiryDate?: string;
  isActive: boolean;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface Blog {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  image: string;
  readTime: string;
  date: string;
}

export interface Ticket {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'Pending' | 'Resolved';
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  description: string;
  images: string[];
  videos?: string[];
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  helpfulCount: number;
  likeCount: number;
  helpfulVotes: string[];
  likes: string[];
  reports: { userId: string; reason: string; }[];
  adminReply?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface WhatsAppLog {
  id: string;
  orderId: string;
  recipient: string;
  event: string;
  message: string;
  status: 'Sent' | 'Failed';
  attempts: number;
  error?: string | null;
  createdAt: string;
}

export interface AppSettings {
  whatsappNotificationsEnabled: boolean;
}

export interface DatabaseSchema {
  products: Product[];
  users: User[];
  orders: Order[];
  coupons: Coupon[];
  blogs: Blog[];
  tickets: Ticket[];
  notifications: Notification[];
  reviews: Review[];
  walletTransactions: WalletTransaction[];
  whatsappLogs: WhatsAppLog[];
  settings: AppSettings;
}

// In-memory fallback if file system is slow or locked
let inMemoryDB: DatabaseSchema | null = null;

// Read Database
export function getDb(): DatabaseSchema {
  if (inMemoryDB) return inMemoryDB;

  try {
    if (!fs.existsSync(DB_PATH)) {
      // Return empty schema if file doesn't exist
      return { products: [], users: [], orders: [], coupons: [], blogs: [], tickets: [], notifications: [], reviews: [], walletTransactions: [], whatsappLogs: [], settings: { whatsappNotificationsEnabled: true } };
    }
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    inMemoryDB = JSON.parse(rawData);
    // Backward compatibility for notifications
    // Backward compatibility for reviews
    if (!inMemoryDB!.reviews) inMemoryDB!.reviews = [];
    if (!inMemoryDB!.walletTransactions) inMemoryDB!.walletTransactions = [];
    if (!inMemoryDB!.coupons) inMemoryDB!.coupons = [];
    if (!inMemoryDB!.whatsappLogs) inMemoryDB!.whatsappLogs = [];
    if (!inMemoryDB!.settings) inMemoryDB!.settings = { whatsappNotificationsEnabled: true };
    return inMemoryDB!;
  } catch (error) {
    console.error('Error reading database file, using empty default:', error);
    return { products: [], users: [], orders: [], coupons: [], blogs: [], tickets: [], notifications: [], reviews: [], walletTransactions: [], whatsappLogs: [], settings: { whatsappNotificationsEnabled: true } };
  }
}

// Write Database
export function saveDb(data: DatabaseSchema): boolean {
  inMemoryDB = data;
  try {
    // Ensure parent directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving database to file:', error);
    return false;
  }
}

// Model-like Helpers
export const db = {
  products: {
    getAll: () => getDb().products,
    getById: (id: string) => getDb().products.find(p => p.id === id),
    create: (product: Product) => {
      const current = getDb();
      current.products.push(product);
      saveDb(current);
      return product;
    },
    update: (id: string, updates: Partial<Product>) => {
      const current = getDb();
      const index = current.products.findIndex(p => p.id === id);
      if (index === -1) return null;
      current.products[index] = { ...current.products[index], ...updates };
      saveDb(current);
      return current.products[index];
    },
    delete: (id: string) => {
      const current = getDb();
      const initialLength = current.products.length;
      current.products = current.products.filter(p => p.id !== id);
      saveDb(current);
      return current.products.length < initialLength;
    }
  },
  users: {
    getAll: () => getDb().users,
    getById: (id: string) => getDb().users.find(u => u.id === id),
    getByEmail: (email: string) => getDb().users.find(u => u.email.toLowerCase() === email.toLowerCase()),
    create: (user: User) => {
      const current = getDb();
      current.users.push(user);
      saveDb(current);
      return user;
    },
    update: (id: string, updates: Partial<User>) => {
      const current = getDb();
      const index = current.users.findIndex(u => u.id === id);
      if (index === -1) return null;
      current.users[index] = { ...current.users[index], ...updates };
      saveDb(current);
      return current.users[index];
    }
  },
  orders: {
    getAll: () => getDb().orders,
    getById: (id: string) => getDb().orders.find(o => o.id === id),
    getByUserId: (userId: string) => getDb().orders.filter(o => o.userId === userId),
    create: (order: Order) => {
      const current = getDb();
      current.orders.unshift(order); // Store newest first
      saveDb(current);
      return order;
    },
    update: (id: string, updates: Partial<Order>) => {
      const current = getDb();
      const index = current.orders.findIndex(o => o.id === id);
      if (index === -1) return null;
      current.orders[index] = { ...current.orders[index], ...updates };
      saveDb(current);
      return current.orders[index];
    }
  },

  blogs: {
    getAll: () => getDb().blogs,
    getById: (id: string) => getDb().blogs.find(b => b.id === id)
  },
  tickets: {
    getAll: () => getDb().tickets,
    create: (ticket: Ticket) => {
      const current = getDb();
      current.tickets.unshift(ticket);
      saveDb(current);
      return ticket;
    },
    update: (id: string, updates: Partial<Ticket>) => {
      const current = getDb();
      const index = current.tickets.findIndex(t => t.id === id);
      if (index === -1) return null;
      current.tickets[index] = { ...current.tickets[index], ...updates };
      saveDb(current);
      return current.tickets[index];
    },
    delete: (id: string) => {
      const current = getDb();
      const initialLength = current.tickets.length;
      current.tickets = current.tickets.filter(t => t.id !== id);
      saveDb(current);
      return current.tickets.length < initialLength;
    }
  },
  notifications: {
    getAll: () => getDb().notifications || [],
    getByUserId: (userId: string) => (getDb().notifications || []).filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    create: (notification: Notification) => {
      const current = getDb();
      if (!current.notifications) current.notifications = [];
      current.notifications.unshift(notification);
      saveDb(current);
      return notification;
    },
    update: (id: string, updates: Partial<Notification>) => {
      const current = getDb();
      if (!current.notifications) return null;
      const index = current.notifications.findIndex(n => n.id === id);
      if (index === -1) return null;
      current.notifications[index] = { ...current.notifications[index], ...updates };
      saveDb(current);
      return current.notifications[index];
    },
    delete: (id: string) => {
      const current = getDb();
      if (!current.notifications) return false;
      const initialLength = current.notifications.length;
      current.notifications = current.notifications.filter(n => n.id !== id);
      saveDb(current);
      return current.notifications.length < initialLength;
    },
    deleteByUserId: (userId: string) => {
      const current = getDb();
      if (!current.notifications) return false;
      current.notifications = current.notifications.filter(n => n.userId !== userId);
      saveDb(current);
      return true;
    }
  },
  reviews: {
    getAll: () => getDb().reviews,
    getById: (id: string) => getDb().reviews.find(r => r.id === id),
    getByProductId: (productId: string) => getDb().reviews.filter(r => r.productId === productId),
    create: (review: Review) => {
      const current = getDb();
      current.reviews.push(review);
      saveDb(current);
      return review;
    },
    update: (id: string, updates: Partial<Review>) => {
      const current = getDb();
      const index = current.reviews.findIndex(r => r.id === id);
      if (index === -1) return null;
      current.reviews[index] = { ...current.reviews[index], ...updates };
      saveDb(current);
      return current.reviews[index];
    },
    delete: (id: string) => {
      const current = getDb();
      const initialLength = current.reviews.length;
      current.reviews = current.reviews.filter(r => r.id !== id);
      saveDb(current);
      return current.reviews.length < initialLength;
    },
    interact: (id: string, updates: Partial<Review>) => {
      const current = getDb();
      const index = current.reviews.findIndex(r => r.id === id);
      if (index !== -1) {
        current.reviews[index] = { ...current.reviews[index], ...updates };
        saveDb(current);
        return current.reviews[index];
      }
      return null;
    }
  },
  wallet: {
    getByUserId: (userId: string) => getDb().walletTransactions.filter(t => t.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    addTransaction: (tx: WalletTransaction) => {
      const current = getDb();
      current.walletTransactions.push(tx);
      saveDb(current);
      return tx;
    }
  },
  coupons: {
    getAll: () => getDb().coupons,
    getByCode: (code: string) => getDb().coupons.find(c => c.code.toUpperCase() === code.toUpperCase()),
    create: (coupon: Coupon) => {
      const current = getDb();
      current.coupons.push(coupon);
      saveDb(current);
      return coupon;
    },
    update: (code: string, updates: Partial<Coupon>) => {
      const current = getDb();
      const index = current.coupons.findIndex(c => c.code === code);
      if (index !== -1) {
        current.coupons[index] = { ...current.coupons[index], ...updates };
        saveDb(current);
        return current.coupons[index];
      }
      return null;
    },
    delete: (code: string) => {
      const current = getDb();
      current.coupons = current.coupons.filter(c => c.code !== code);
      saveDb(current);
    }
  },
  whatsappLogs: {
    getAll: () => getDb().whatsappLogs || [],
    create: (log: WhatsAppLog) => {
      const current = getDb();
      if (!current.whatsappLogs) current.whatsappLogs = [];
      current.whatsappLogs.unshift(log);
      saveDb(current);
      return log;
    },
    update: (id: string, updates: Partial<WhatsAppLog>) => {
      const current = getDb();
      if (!current.whatsappLogs) return null;
      const idx = current.whatsappLogs.findIndex(l => l.id === id);
      if (idx !== -1) {
        current.whatsappLogs[idx] = { ...current.whatsappLogs[idx], ...updates };
        saveDb(current);
        return current.whatsappLogs[idx];
      }
      return null;
    }
  },
  settings: {
    get: () => {
      const current = getDb();
      if (!current.settings) {
        current.settings = { whatsappNotificationsEnabled: true };
        saveDb(current);
      }
      return current.settings;
    },
    update: (updates: Partial<AppSettings>) => {
      const current = getDb();
      if (!current.settings) current.settings = { whatsappNotificationsEnabled: true };
      current.settings = { ...current.settings, ...updates };
      saveDb(current);
      return current.settings;
    }
  }
};
