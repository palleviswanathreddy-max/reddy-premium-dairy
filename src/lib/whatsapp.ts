import { Order } from '@/db/db';
import { prisma } from '@/lib/prisma';

// Helper to check if WhatsApp notifications are enabled
export async function isWhatsAppEnabled(): Promise<boolean> {
  try {
    const dbSettings = await prisma.appSettings.findFirst();
    if (dbSettings) {
      return dbSettings.whatsappNotificationsEnabled;
    }
  } catch (err) {
    console.warn('[Prisma Settings Read Error] Using fallback settings:', err);
  }
  return true; // enabled by default
}

// Log a WhatsApp message status in DB
export async function logWhatsAppMessage(logData: {
  orderId: string;
  recipient: string;
  event: string;
  message: string;
  status: 'Sent' | 'Failed';
  error?: string | null;
}) {
  try {
    const log = await prisma.whatsAppLog.create({
      data: {
        orderId: logData.orderId,
        recipient: logData.recipient,
        event: logData.event,
        message: logData.message,
        status: logData.status,
        attempts: 1,
        error: logData.error || null,
      }
    });
    return log;
  } catch (err) {
    console.error('[Prisma WhatsApp Log Error] Falling back to memory return:', err);
    return {
      id: `WAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: logData.orderId,
      recipient: logData.recipient,
      event: logData.event,
      message: logData.message,
      status: logData.status,
      attempts: 1,
      error: logData.error || null,
      createdAt: new Date()
    };
  }
}

// Format message for WhatsApp Business API templates/text payload
export function formatWhatsAppMessage(event: string, order: Order): string {
  const customerName = order.deliveryAddress.name;
  const orderId = order.id;
  const products = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
  const totalAmount = `₹${order.grandTotal.toFixed(2)}`;
  const deliveryTime = order.deliverySlot || order.expectedDelivery || 'Morning (6:00 AM - 9:00 AM)';
  const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://reddy-premium-dairy.vercel.app'}/orders/${order.id}`;

  switch (event) {
    case 'Order Placed':
      return `🥛 *New Order Placed!* \n\nHi *${customerName}*,\nYour order *${orderId}* has been successfully placed!\n\n• *Products*: ${products}\n• *Total*: ${totalAmount}\n• *Delivery Slot*: ${deliveryTime}\n• *Track here*: ${trackingLink}\n\nThank you for choosing Reddy Premium Dairy! 💚`;
    
    case 'Payment Successful':
      return `💳 *Payment Successful!* \n\nHi *${customerName}*,\nPayment for order *${orderId}* is verified successfully.\n\n• *Amount Paid*: ${totalAmount}\n• *Track details*: ${trackingLink}\n\nYour dairy products are being prepared fresh from the farm! 🐮`;

    case 'Order Confirmed':
      return `✅ *Order Confirmed!* \n\nHi *${customerName}*,\nYour order *${orderId}* is confirmed by our manager.\n\n• *Amount*: ${totalAmount}\n• *Expected slot*: ${deliveryTime}\n• *Track order*: ${trackingLink}`;

    case 'Order Packed':
      return `📦 *Order Packed!* \n\nHi *${customerName}*,\nYour order *${orderId}* is hygienically packed in specialized temperature-controlled dairy crates and is ready for dispatch.\n\n• *Track status*: ${trackingLink}`;

    case 'Out For Delivery':
      return `🚚 *Out for Delivery!* \n\nHi *${customerName}*,\nYour fresh dairy products are out for delivery!\n\n• *Partner*: Ramesh Kumar\n• *Contact*: +91 6300928511\n• *Live track map*: ${trackingLink}`;

    case 'Delivered':
      return `🎉 *Order Delivered!* \n\nHi *${customerName}*,\nYour order *${orderId}* was delivered fresh at your doorstep!\n\n• *Total Amount Paid*: ${totalAmount}\n• *View Invoice*: ${trackingLink}\n\nHope you love our purity and quality! Feedback is appreciated. 🥛`;

    case 'Order Cancelled':
      return `❌ *Order Cancelled!* \n\nHi *${customerName}*,\nYour order *${orderId}* has been cancelled.\n\n• *Details & Support*: ${trackingLink}\n\nAny prepaid amounts will be refunded immediately.`;

    case 'Refund Processed':
      return `💸 *Refund Processed!* \n\nHi *${customerName}*,\nYour refund of *${totalAmount}* for order *${orderId}* has been credited to your original payment source.\n\n• *Order ID*: ${orderId}\n• *Verify settlement*: ${trackingLink}`;

    default:
      return `Hi *${customerName}*, your order *${orderId}* status is updated. Check updates: ${trackingLink}`;
  }
}

// Send WhatsApp Message via API
export async function sendWhatsAppMessage(recipientPhone: string, messageText: string, orderId: string, event: string) {
  const enabled = await isWhatsAppEnabled();
  if (!enabled) {
    console.warn(`[WhatsApp Notification Skipped] Globally disabled in settings.`);
    return { success: false, reason: 'Disabled in settings' };
  }

  // Ensure recipient phone has proper country code format
  let formattedPhone = recipientPhone.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token || token.includes('DummyToken')) {
    // Development or Mock Mode: Logs output to console and registers log as successfully sent
    console.log(`[MOCK WHATSAPP SEND] to: +${formattedPhone}\nMessage:\n${messageText}`);
    await logWhatsAppMessage({
      orderId,
      recipient: formattedPhone,
      event,
      message: messageText,
      status: 'Sent'
    });
    return { success: true, mock: true };
  }

  const apiUrl = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/v17.0/${phoneId}/messages`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: messageText }
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`[WhatsApp API Success] message sent to +${formattedPhone}`);
      await logWhatsAppMessage({
        orderId,
        recipient: formattedPhone,
        event,
        message: messageText,
        status: 'Sent'
      });
      return { success: true, messageId: data.messages?.[0]?.id };
    } else {
      const errMsg = JSON.stringify(data.error || data);
      console.error(`[WhatsApp API Error]`, errMsg);
      await logWhatsAppMessage({
        orderId,
        recipient: formattedPhone,
        event,
        message: messageText,
        status: 'Failed',
        error: errMsg
      });
      return { success: false, error: errMsg };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp Fetch Network Error]`, errMsg);
    await logWhatsAppMessage({
      orderId,
      recipient: formattedPhone,
      event,
      message: messageText,
      status: 'Failed',
      error: errMsg
    });
    return { success: false, error: errMsg };
  }
}
// Background scheduler tool retry failed messages
export async function retryFailedWhatsAppMessages() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const isMock = !phoneId || !token || token.includes('DummyToken');

  try {
    const failedLogs = await prisma.whatsAppLog.findMany({
      where: {
        status: 'Failed',
        attempts: { lt: 3 }
      }
    });

    for (const log of failedLogs) {
      const attempts = log.attempts + 1;
      console.log(`[Retrying WhatsApp Log ${log.id}] Attempt ${attempts}`);

      let status = log.status;
      let error = log.error;

      if (isMock) {
        status = 'Sent';
        error = null;
      } else {
        const apiUrl = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/v17.0/${phoneId}/messages`;
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: log.recipient,
              type: 'text',
              text: { body: log.message }
            })
          });

          if (response.ok) {
            status = 'Sent';
            error = null;
          } else {
            const data = await response.json();
            error = JSON.stringify(data.error || data);
          }
        } catch (err: unknown) {
          error = err instanceof Error ? err.message : String(err);
        }
      }

      await prisma.whatsAppLog.update({
        where: { id: log.id },
        data: {
          attempts,
          status,
          error
        }
      });
    }
  } catch (err) {
    console.warn('[Prisma Retries Error]', err);
  }
}
