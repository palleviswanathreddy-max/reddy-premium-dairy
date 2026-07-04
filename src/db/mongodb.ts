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
  createdAt: { type: Date, default: Date.now }
});

// OTP Schema
const OtpSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  otpCode: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

export const MongooseUser = mongoose.models.User || mongoose.model('User', UserSchema);
export const MongooseOTP = mongoose.models.OTP || mongoose.model('OTP', OtpSchema);
