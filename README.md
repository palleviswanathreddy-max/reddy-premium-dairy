<<<<<<< HEAD
# 🥛 Reddy Premium Dairy — Enterprise Edition

> **Pure • Fresh • Healthy** — A production-ready enterprise dairy e-commerce platform built with Next.js 16, TypeScript, PostgreSQL, and Prisma ORM.

---

## 🌐 Live Platform

- **App URL**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin`
- **Demo Admin Credentials**:
  - **Email**: `admin@reddydairy.com`
  - **Password**: `Admin@123`

---

## 🏗️ Architecture & Database Stack

The project has been migrated from a local JSON / MongoDB setup into a fully normalized **PostgreSQL** database managed via **Prisma ORM**.

### Normalized Schema (20+ Models)
- **User & Security**: `User`, `RefreshToken`, `ActivityLog` (audits all customer/admin events)
- **Storefront & Catalog**: `Product`, `Category`, `Review`, `Coupon`, `CouponUsage`, `Address`
- **Checkout & Sales**: `Order`, `OrderItem`, `Payment`, `Refund`, `Wallet`, `WalletTransaction`
- **Operations & Support**: `DeliveryPartner`, `SupportTicket`, `Notification`

### Database Optimizations
- **Auto-Seeding**: On first boot, the application automatically seeds your categories and products from `localdb.json` directly into PostgreSQL if the database is empty.
- **Atomic Operations**: All checkout processes, wallet transactions, and stock adjustments run within Prisma transactions to ensure data consistency.
- **Relational Integrity**: Set up cascades, indexes on foreign keys, and unique constraint handling to support high concurrent workloads.

---

## ⚡ Key Enterprise Features

### 1. Unified Authentication
- **Custom JWT Auth**: Access and refresh tokens with automated cookie session management.
- **Email, Phone, & OTP Login**: Fully supported. If external gateways aren't configured, verification codes display directly on-screen in development fallback mode.
- **Secure Password Hashing**: Uses bcrypt hashing for all credentials.

### 2. E-Commerce Order Lifecycle
- **Real-Time Inventory Sync**: Stocks are reduced atomically during checkout. If an order is marked as `Cancelled`, the inventory is automatically restored.
- **Atomic Wallet Transactions**: Customers can pay using virtual wallet balances. Refunds debit and credit are handled atomically.
- **Timeline Tracking**: Order statuses include timestamp logs (`Pending` → `Confirmed` → `Packed` → `Out for Delivery` → `Delivered` → `Cancelled`).
- **Professional PDF Invoices**: Auto-generated dynamic invoice bills available for download under `/invoice/[id]`.

### 3. Admin Insights Dashboard
- **Insights & Metrics**: Conversions rate, per-customer spend analytics, and lists of high-demand items that are frequently viewed but not yet purchased.
- **Spreadsheet Exports**: Excel and CSV generation for orders, customers, products, inventory records, sales stats, and refunds.
- **Live Notifications**: Server-Sent Events (SSE) broadcast real-time events to the dashboard for instant screen updates.

### 4. Operations & Moderation
- **Delivery Partner Tracking**: Manage delivery partner vehicles, status, and active order counts.
- **Support System**: CRUD dashboard for customer support tickets (`Pending` → `In Progress` → `Resolved`).
- **Review Moderation**: Approve/reject customer reviews, view helpful votes, report counts, and post admin replies.

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database instance

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Database Credentials
DATABASE_URL="postgresql://postgres:password@localhost:5432/reddy_dairy?schema=public"

# Session Keys
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key"

# Razorpay credentials (optional for testing checkout payments)
RAZORPAY_KEY_ID="rzp_test_xxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxx"
```

### 3. Initialize Database and Build
```bash
# Install dependencies
npm install

# Push database schema and generate Prisma client
npx prisma db push
npx prisma generate

# Run the development server
npm run dev
```

The application will initialize, run the startup health-checks, seed database tables, and start up the Next.js dev server at `http://localhost:3000`.

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16.2 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL |
| **ORM** | Prisma ORM |
| **Styling** | Vanilla CSS + Tailwind Utility Classes |
| **Animations** | Framer Motion |
| **Build Compiler** | Webpack Custom Builder |
| **Deployment** | Vercel |

---

## 📁 Key File Map

```text
prisma/
├── schema.prisma        # Normalized database model definitions
└── seed.ts              # Seeding script for products & categories
src/
├── app/
│   ├── admin/           # Admin Analytics and moderations dashboard pages
│   ├── login/           # OTP Sign-in, Register, & Forgot password tabs
│   ├── checkout/        # Checkout flow with coupon & delivery validation
│   └── api/             # REST Endpoints (auth, orders, stats, inventory, exports)
├── context/
│   └── AppContext.tsx   # Global React State context, theme toggle, and unified stores
└── db/
    └── db.ts            # Core TypeScript model interfaces
```

---

## 📦 Production Builds

To compile and check types for a production deployment:

```bash
# Build package (forced to build via webpack configuration)
npm run build -- --webpack
```

---

## 👨‍💻 Platform Contacts

### Palle Viswanath Reddy
- 📞 **Phone**: +91 63009 28511
- 📧 **Email**: <palleviswanathreddy19@gmail.com>
- 🏭 **Location**: Chiyyedu Farm, Anantapur, Andhra Pradesh

---
*© 2026 Reddy Premium Dairy. All rights reserved.*
=======
# reddy-premium-dairy
>>>>>>> 85c22bdce19353af88679fb98a8934664d3efe75
