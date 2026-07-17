import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { message, lang = 'en', userId } = await request.json();
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message is required' }, { status: 400 });
    }

    const query = message.toLowerCase().trim();
    let reply = '';

    // Fetch data from PostgreSQL
    let productsList: any[] = [];
    let ordersList: any[] = [];

    try {
      [productsList, ordersList] = await Promise.all([
        prisma.product.findMany({
          select: { id: true, name: true, price: true, description: true, stock: true },
          where: { status: 'Available' },
          take: 100
        }),
        userId ? prisma.order.findMany({
          where: { userId },
          include: { deliveryPartner: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }) : Promise.resolve([])
      ]);
    } catch (dbErr) {
      console.warn('[support/chat] DB query failed:', dbErr);
    }

    // ORDER TRACKING LOGIC
    const isTrackingQuery = query.includes('track') || query.includes('order') || query.includes('ట్రాక్') || query.includes('ఆర్డర్');
    const orderMatch = query.match(/od-\d+/i) || query.match(/od-[a-z0-9]+/i);

    if (isTrackingQuery || orderMatch) {
      let targetOrder: any = null;
      if (orderMatch) {
        const oId = orderMatch[0].toUpperCase();
        targetOrder = ordersList.find((o: any) => o.id === oId);
        if (!targetOrder) {
          try {
            targetOrder = await prisma.order.findUnique({
              where: { id: oId },
              include: { deliveryPartner: true }
            });
          } catch { /* ignore */ }
        }
      } else if (ordersList.length > 0) {
        targetOrder = ordersList[0];
      }

      if (targetOrder) {
        const orderId = targetOrder.id;
        const status = targetOrder.status;
        const total = targetOrder.grandTotal || targetOrder.total;
        const partnerName = targetOrder.deliveryPartner?.name || 'Viswanatha Reddy';
        const partnerPhone = targetOrder.deliveryPartner?.phone || '6300928511';

        if (lang === 'te') {
          reply = `📦 మీ ఆర్డర్ వివరాలు (${orderId}):\n• స్థితి: ${status.toUpperCase()}\n• మొత్తం: ₹${total}\n• డెలివరీ పార్ట్నర్: ${partnerName} (${partnerPhone})\n\nత్వరలోనే మీ ఇంటి వద్దకు డెలివరీ చేయబడుతుంది.`;
        } else {
          reply = `📦 Your Order Details (${orderId}):\n• Status: ${status.toUpperCase()}\n• Grand Total: ₹${total}\n• Delivery Partner: ${partnerName} (${partnerPhone})\n\nOur partner is navigating to your address.`;
        }
        return NextResponse.json({ success: true, reply });
      } else {
        reply = lang === 'te'
          ? `క్షమించండి, మీ ఆర్డర్ కనుగొనబడలేదు. దయచేసి సరైన ఆర్డర్ ఐడిని పేర్కొనండి (ఉదాహరణ: OD-123456).`
          : `Sorry, we couldn't locate any active order. Please provide a valid Order ID (e.g. OD-123456) to track.`;
        return NextResponse.json({ success: true, reply });
      }
    }

    // PRODUCT INFORMATION LOGIC
    let matchedProduct: any = null;
    const productKeywords: Record<string, string[]> = {
      milk: ['milk', 'పాలు'],
      ghee: ['ghee', 'నెయ్యి'],
      paneer: ['paneer', 'పనీర్'],
      curd: ['curd', 'yogurt', 'పెరుగు'],
      buffalo: ['buffalo', 'గేదె'],
      cow: ['cow', 'ఆవు']
    };

    for (const [keyword, terms] of Object.entries(productKeywords)) {
      if (terms.some(t => query.includes(t))) {
        matchedProduct = productsList.find((p: any) => p.name.toLowerCase().includes(keyword));
        if (matchedProduct) break;
      }
    }

    if (matchedProduct) {
      const { name, price, description } = matchedProduct;
      if (lang === 'te') {
        reply = `🥛 *${name}*:\n• ధర: ₹${price}\n• వివరణ: ${description || 'తాజా ఫారం నుండి'}\n\nఈ ఉత్పత్తిని కొనుగోలు చేయడానికి "Products" విభాగాన్ని సందర్శించండి!`;
      } else {
        reply = `🥛 *${name}*:\n• Price: ₹${price}\n• Description: ${description || 'Fresh from farms'}\n\nYou can order this product directly from our Products section!`;
      }
      return NextResponse.json({ success: true, reply });
    }

    // CONVERSATIONAL DEFAULT FAQs
    if (lang === 'te') {
      if (query.includes('hello') || query.includes('hi') || query.includes('హలో') || query.includes('నమస్కారం')) {
        reply = `నమస్కారం! రెడ్డి ప్రీమియం డెయిరీ AI అసిస్టెంట్‌కు స్వాగతం. నేను మీకు ఎలా సహాయం చేయగలను?\n1. ఉత్పత్తుల సమాచారం (పాలు, నెయ్యి, పెరుగు, పనీర్)\n2. ఆర్డర్ ట్రాకింగ్`;
      } else if (query.includes('address') || query.includes('location') || query.includes('చిరునామా')) {
        reply = `📍 మా డెయిరీ ఫార్మ్ చియ్యేడు, అనంతపురం, ఆంధ్రప్రదేశ్ లో ఉంది.`;
      } else if (query.includes('time') || query.includes('delivery') || query.includes('సమయం')) {
        reply = `⚡ మేము ఆర్డర్ చేసిన 2 గంటలలోపు తాజా పాలు డెలివరీ చేస్తాము!`;
      } else if (query.includes('contact') || query.includes('phone') || query.includes('ఫోన్')) {
        reply = `📞 మీరు మమ్మల్ని 6300928511 నంబర్ ద్వారా సంప్రదించవచ్చు.`;
      } else {
        reply = `క్షమించండి, మీ ప్రశ్న నాకు అర్థం కాలేదు. దయచేసి ఉత్పత్తులు లేదా ఆర్డర్ ట్రాకింగ్ గురించి అడగండి.`;
      }
    } else {
      if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        reply = `Hello! Welcome to Reddy Premium Dairy Support. How can I help you today?\n1. Ask about Products (Milk, Ghee, Curd, Paneer)\n2. Track your Order (Type "Track my order")`;
      } else if (query.includes('address') || query.includes('location') || query.includes('where')) {
        reply = `📍 Our farm is located at Chiyyedu, Anantapur, Andhra Pradesh. We deliver 100% pure & organic farm-fresh milk.`;
      } else if (query.includes('time') || query.includes('delivery') || query.includes('when')) {
        reply = `⚡ We deliver your orders fresh within 2 hours of placing them!`;
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
