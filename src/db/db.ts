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
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  village: string;
  district: string;
  state: string;
  pincode: string;
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
  isVerified?: boolean;
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
  giftMessage?: string;
  deliveryInstructions?: string;
}

export interface Coupon {
  code: string;
  description: string;
  type: 'flat' | 'percentage' | 'free_shipping';
  value: number;
  minPurchase: number;
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

export interface DatabaseSchema {
  products: Product[];
  users: User[];
  orders: Order[];
  coupons: Coupon[];
  blogs: Blog[];
  tickets: Ticket[];
}

// In-memory fallback if file system is slow or locked
let inMemoryDB: DatabaseSchema | null = null;

// Read Database
export function getDb(): DatabaseSchema {
  if (inMemoryDB) return inMemoryDB;

  try {
    if (!fs.existsSync(DB_PATH)) {
      // Return empty schema if file doesn't exist
      return { products: [], users: [], orders: [], coupons: [], blogs: [], tickets: [] };
    }
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    inMemoryDB = JSON.parse(rawData);
    return inMemoryDB!;
  } catch (error) {
    console.error('Error reading database file, using empty default:', error);
    return { products: [], users: [], orders: [], coupons: [], blogs: [], tickets: [] };
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
  coupons: {
    getAll: () => getDb().coupons,
    getByCode: (code: string) => getDb().coupons.find(c => c.code.toUpperCase() === code.toUpperCase())
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
    }
  }
};
