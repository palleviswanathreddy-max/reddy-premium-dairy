import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reddy-premium-dairy';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// User Schema
const AddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  village: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: 'Andhra Pradesh' },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  avatar: { type: String, default: null },
  walletBalance: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },
  addresses: [AddressSchema],
  verifiedEmail: { type: Boolean, default: false },
  verifiedPhone: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  bloodGroup: { type: String, default: null },
  emergencyContact: { type: String, default: null },
  biometricsEnabled: { type: Boolean, default: false },
  biometricCredentialId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// OTP Schema
const OtpSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true }, // email or phone number
  identifierType: { type: String, enum: ['email', 'phone'], required: true },
  purpose: { type: String, enum: ['registration', 'login'], default: 'registration' },
  otpCode: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

export const MongooseUser = mongoose.models.User || mongoose.model('User', UserSchema);
export const MongooseOTP = mongoose.models.OTP || mongoose.model('OTP', OtpSchema);

// ── UserActivity Schema ──────────────────────────────────────────────────────
// Tracks per-user behavior: views, cart, wishlist, purchases, logins.
// NOTE: Activity logging is MongoDB-only. The local JSON DB fallback does NOT
// store activity records — at scale, activity logs must use a real database.
const UserActivitySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },      // user id or "guest_<sessionId>"
    type: {
      type: String,
      enum: ['view', 'cart_add', 'wishlist_add', 'purchase', 'login'],
      required: true,
      index: true
    },
    productId: { type: String, default: null, index: true },
    productName: { type: String, default: null },
    orderId: { type: String, default: null },
    quantity: { type: Number, default: null },
    amount: { type: Number, default: null },
    meta: {
      device: { type: String, default: null },
      source: { type: String, default: null }
    }
  },
  {
    timestamps: true,          // adds createdAt, updatedAt automatically
    versionKey: false
  }
);

// TTL index: auto-delete activity records older than 1 year
UserActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const MongooseUserActivity =
  mongoose.models.UserActivity ||
  mongoose.model('UserActivity', UserActivitySchema);

// WhatsApp Log Schema
const WhatsAppLogSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  recipient: { type: String, required: true },
  event: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Sent', 'Failed'], default: 'Sent' },
  attempts: { type: Number, default: 1 },
  error: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const MongooseWhatsAppLog = mongoose.models.WhatsAppLog || mongoose.model('WhatsAppLog', WhatsAppLogSchema);

// App Settings Schema
const AppSettingsSchema = new mongoose.Schema({
  whatsappNotificationsEnabled: { type: Boolean, default: true }
});

export const MongooseAppSettings = mongoose.models.AppSettings || mongoose.model('AppSettings', AppSettingsSchema);

