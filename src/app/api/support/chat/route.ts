import { NextResponse } from 'next/server';
import { connectMongo } from '@/db/mongodb';
import { getDb } from '@/db/db';
import mongoose from 'mongoose';

// Define Mongoose Order Schema if not defined or fetch existing
const MongooseOrder = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
  userId: String,
  items: Array,
  total: Number,
  status: String,
  paymentMethod: String,
  paymentStatus: String,
  deliveryBoy: Object,
  createdAt: Date
}));

// Define Mongoose Product Schema if not defined or fetch existing
const MongooseProduct = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  category: String,
  sku: String,
  stock: Number
}));

export async function POST(request: Request) {
  try {
    const { message, lang = 'en', userId } = await request.json();
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message is required' }, { status: 400 });
    }

    const query = message.toLowerCase().trim();
    let reply = '';

    // 1. Establish DB Connections
    let productsList: any[] = [];
    let ordersList: any[] = [];

    if (process.env.MONGODB_URI) {
      try {
        await connectMongo();
        productsList = await MongooseProduct.find({});
        if (userId) {
          ordersList = await MongooseOrder.find({ userId }).sort({ createdAt: -1 });
        } else {
          // Try to search by matching any order ID pattern in the query e.g. "od-123456"
          const match = query.match(/od-[a-z0-9]+/i);
          if (match) {
            ordersList = await MongooseOrder.find({ id: match[0].toUpperCase() });
          }
        }
      } catch (err) {
        console.warn('MongoDB query failed in support chat, using local JSON DB:', err);
      }
    }

    if (productsList.length === 0) {
      const localDb = getDb();
      productsList = localDb.products || [];
      if (userId) {
        ordersList = (localDb.orders || []).filter((o: any) => o.userId === userId);
      } else {
        const match = query.match(/od-[a-z0-9]+/i);
        if (match) {
          ordersList = (localDb.orders || []).filter((o: any) => o.id === match[0].toUpperCase());
        }
      }
    }

    // ──────────────────────────────────────────────
    // A. ORDER TRACKING LOGIC
    // ──────────────────────────────────────────────
    const isTrackingQuery = query.includes('track') || query.includes('order') || query.includes('ట్రాక్') || query.includes('ఆర్డర్');
    const orderMatch = query.match(/od-\d+/i) || query.match(/od-[a-z0-9]+/i);

    if (isTrackingQuery || orderMatch) {
      let targetOrder = null;
      if (orderMatch) {
        const oId = orderMatch[0].toUpperCase();
        targetOrder = ordersList.find((o: any) => o.id === oId || o._id?.toString() === oId);
      } else if (ordersList.length > 0) {
        targetOrder = ordersList[0]; // pick most recent
      }

      if (targetOrder) {
        const orderId = targetOrder.id || targetOrder._id?.toString();
        const status = targetOrder.status;
        const total = targetOrder.total;
        const deliveryBoyName = targetOrder.deliveryBoy?.name || 'Viswanatha Reddy';
        const deliveryBoyPhone = targetOrder.deliveryBoy?.phone || '6300928511';

        if (lang === 'te') {
          reply = `📦 మీ ఆర్డర్ వివరాలు (${orderId}):\n• స్థితి: ${status.toUpperCase()}\n• మొత్తం: ₹${total}\n• డెలివరీ పార్ట్నర్: ${deliveryBoyName} (${deliveryBoyPhone})\n\nత్వరలోనే మీ ఇంటి వద్దకు డెలివరీ చేయబడుతుంది.`;
        } else {
          reply = `📦 Your Order Details (${orderId}):\n• Status: ${status.toUpperCase()}\n• Grand Total: ₹${total}\n• Delivery Partner: ${deliveryBoyName} (${deliveryBoyPhone})\n\nOur partner is navigating to your address.`;
        }
        return NextResponse.json({ success: true, reply });
      } else {
        if (lang === 'te') {
          reply = `క్షమించండి, మీ ఆర్డర్ కనుగొనబడలేదు. దయచేసి సరైన ఆర్డర్ ఐడిని పేర్కొనండి (ఉదాహరణ: OD-123456).`;
        } else {
          reply = `Sorry, we couldn't locate any active order. Please provide a valid Order ID (e.g. OD-123456) to track.`;
        }
        return NextResponse.json({ success: true, reply });
      }
    }

    // ──────────────────────────────────────────────
    // B. PRODUCT INFORMATION LOGIC
    // ──────────────────────────────────────────────
    let matchedProduct = null;
    if (query.includes('milk') || query.includes('పాలు')) {
      matchedProduct = productsList.find((p: any) => p.name.toLowerCase().includes('milk'));
    } else if (query.includes('ghee') || query.includes('నెయ్యి')) {
      matchedProduct = productsList.find((p: any) => p.name.toLowerCase().includes('ghee'));
    } else if (query.includes('paneer') || query.includes('పనీర్')) {
      matchedProduct = productsList.find((p: any) => p.name.toLowerCase().includes('paneer'));
    } else if (query.includes('curd') || query.includes('పెరుగు')) {
      matchedProduct = productsList.find((p: any) => p.name.toLowerCase().includes('curd') || p.name.toLowerCase().includes('yogurt'));
    } else if (query.includes('buffalo') || query.includes('గేదె')) {
      matchedProduct = productsList.find((p: any) => p.name.toLowerCase().includes('buffalo'));
    } else if (query.includes('cow') || query.includes('ఆవు')) {
      matchedProduct = productsList.find((p: any) => p.name.toLowerCase().includes('cow'));
    }

    if (matchedProduct) {
      const name = matchedProduct.name;
      const price = matchedProduct.price;
      const desc = matchedProduct.description || 'Fresh from farms';
      const category = matchedProduct.category || 'Dairy';

      if (lang === 'te') {
        reply = `🥛 *${name}* (${category}):\n• ధర: ₹${price} \n• వివరణ: ${desc}\n\nఈ ఉత్పత్తిని కొనుగోలు చేయడానికి "Products" విభాగాన్ని సందర్శించండి!`;
      } else {
        reply = `🥛 *${name}* (${category}):\n• Price: ₹${price}\n• Description: ${desc}\n\nYou can order this product directly from our Products section!`;
      }
      return NextResponse.json({ success: true, reply });
    }

    // ──────────────────────────────────────────────
    // C. CONVERSATIONAL DEFAULT FAQS
    // ──────────────────────────────────────────────
    if (lang === 'te') {
      if (query.includes('hello') || query.includes('hi') || query.includes('హలో') || query.includes('నమస్కారం')) {
        reply = `నమస్కారం! రెడ్డి ప్రీమియం డెయిరీ AI అసిస్టెంట్‌కు స్వాగతం. నేను మీకు ఎలా సహాయం చేయగలను?\n1. ఉత్పత్తుల సమాచారం (పాలు, నెయ్యి, పెరుగు, పనీర్)\n2. ఆర్డర్ ట్రాకింగ్ (ఉదాహరణకు: "ఆర్డర్ ట్రాక్ చేయండి")`;
      } else if (query.includes('address') || query.includes('location') || query.includes('చిరునామా') || query.includes('ప్రదేశం')) {
        reply = `📍 మా డెయిరీ ఫార్మ్ చియ్యేడు, అనంతపురం, ఆంధ్రప్రదేశ్ లో ఉంది. మేము చుట్టుపక్కల ప్రాంతాలకు తాజా పాలను అందిస్తాము.`;
      } else if (query.includes('time') || query.includes('delivery') || query.includes('సమయం') || query.includes('డెలివరీ')) {
        reply = `⚡ మేము ఆర్డర్ చేసిన 2 గంటలలోపు తాజా పాలు మరియు పాల ఉత్పత్తులను సురక్షితంగా డెలివరీ చేస్తాము!`;
      } else if (query.includes('contact') || query.includes('phone') || query.includes('ఫోన్') || query.includes('నెంబర్')) {
        reply = `📞 మీరు మమ్మల్ని 6300928511 నంబర్ ద్వారా సంప్రదించవచ్చు. మా ప్రతినిధి పల్లె విశ్వనాథ రెడ్డి మీకు సహాయం చేస్తారు.`;
      } else {
        reply = `క్షమించండి, మీ ప్రశ్న నాకు అర్థం కాలేదు. దయచేసి ఉత్పత్తులు లేదా ఆర్డర్ ట్రాకింగ్ గురించి అడగండి.`;
      }
    } else {
      if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        reply = `Hello! Welcome to Reddy Premium Dairy Support. How can I help you today?\n1. Ask about Products (Milk, Ghee, Curd, Paneer)\n2. Track your Order (Type "Track my order")`;
      } else if (query.includes('address') || query.includes('location') || query.includes('where')) {
        reply = `📍 Our farm is located at Chiyyedu, Anantapur, Andhra Pradesh. We deliver 100% pure & organic farm-fresh milk.`;
      } else if (query.includes('time') || query.includes('delivery') || query.includes('when')) {
        reply = `⚡ We deliver your orders fresh within 2 hours of placing them in local sectors!`;
      } else if (query.includes('contact') || query.includes('phone') || query.includes('call')) {
        reply = `📞 You can contact Viswanatha Reddy at +91 6300928511 for immediate phone support.`;
      } else {
        reply = `I'm sorry, I didn't quite get that. Could you please specify if you'd like to check our products (Cow/Buffalo milk, Curd, Ghee) or track an order?`;
      }
    }

    return NextResponse.json({ success: true, reply });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
