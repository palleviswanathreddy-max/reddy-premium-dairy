# 🥛 Reddy Premium Dairy

> **Pure • Fresh • Healthy** — A full-featured dairy e-commerce platform built with Next.js 16

---

## 🌐 Live Website

**➡️ <https://reddy-premium-dairy.vercel.app>**

---

## ✨ Features

### 🛍️ Customer Features

- Browse **Fresh Milk, Curd, Paneer, Ghee, Butter, Cheese** and more
- **Cart & Wishlist** with real-time quantity management
- **Product comparison** side-by-side
- Multi-step **OTP-based registration** (Email / SMS)
- **Order tracking** with live delivery status timeline
- **Wallet balance** & Reward points system
- **Coupon codes** & discount support
- **Multiple payment methods** — COD, UPI, Card, Net Banking
- **Dark mode** support
- **Multilingual** support (Telugu / English)
- **AI Chatbot** assistant
- 📱 Fully **mobile responsive**

### 🧑‍💼 Admin Dashboard Features

- 📊 **Analytics Overview** — Revenue, Orders, Customers, Best Sellers
- 📦 **Product Management** — Add / Edit / Delete products with CRUD
- 🚚 **Order Management** — View & update delivery status
- 👥 **Customer Database** — All registered users with order counts
- 💳 **Payment Tracking** — Paid / Pending / Failed filters + CSV export
- 🚛 **Delivery Pipeline** — Status tracker with counts per stage
- 📈 **Reports** — Monthly revenue chart, CSV & PDF export

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/reddy-premium-dairy.git
cd reddy-premium-dairy

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view in browser.

### Environment Variables (Optional)

Create a `.env.local` file for full functionality:

```env
# MongoDB Atlas (optional — falls back to local JSON DB)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/reddy-dairy

# Email OTP via SMTP (optional — demo mode if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS OTP via Twilio (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

> **Note:** Without these env vars, the app runs in **Demo Mode** — OTP codes are shown directly on screen for easy testing.

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16.2 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Database** | MongoDB Atlas + Local JSON fallback |
| **Auth** | OTP via Email (Nodemailer) / SMS (Twilio) |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Deployment** | Vercel |

---

## 📁 Project Structure

```text
src/
├── app/
│   ├── page.tsx          # Homepage
│   ├── admin/            # Admin dashboard
│   ├── login/            # Auth (Login + OTP Register)
│   ├── products/         # Product catalogue
│   ├── orders/           # Order tracking
│   ├── checkout/         # Checkout flow
│   ├── profile/          # User profile & addresses
│   └── api/              # API Routes (auth, orders, products, stats)
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── CartSidebar.tsx
│   └── AIChatbot.tsx
├── context/
│   └── AppContext.tsx    # Global state (cart, auth, orders)
├── db/
│   ├── db.ts             # Local JSON database layer
│   ├── mongodb.ts        # MongoDB connection & schemas
│   └── localdb.json      # Seed data
└── utils/
    ├── translations.ts   # Telugu/English i18n
    └── cache.ts          # In-memory cache
```

---

## 🔐 Admin Access

| Field | Value |
| --- | --- |
| **URL** | `/admin` |
| **Email** | `admin@reddydairy.com` |
| **Password** | `Admin@123` |

---

## 📦 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run test       # Run tests
npm run lint       # Run ESLint
```

---

## 🌍 Deployment

Deployed on **Vercel**. To redeploy after changes:

```bash
npx vercel --prod
```

---

## 👨‍💻 Owner

### Palle Viswanath Reddy

- 📞 +91 63009 28511
- 📧 <palleviswanathreddy19@gmail.com>
- 🏭 Chiyyedu Farm, Andhra Pradesh

---

*© 2026 Reddy Premium Dairy. All rights reserved.*
