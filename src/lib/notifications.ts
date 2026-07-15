import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { Order, db } from '@/db/db';
import admin from 'firebase-admin';

// Initialize Nodemailer Transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Initialize Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Firebase Admin
let isFirebaseAdminInitialized = false;

function initFirebaseAdmin() {
  if (isFirebaseAdminInitialized) return true;

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("Firebase Admin credentials missing. Push notifications will be mocked.");
    return false;
  }

  try {
    (admin as any).initializeApp({
      credential: (admin as any).credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    isFirebaseAdminInitialized = true;
    return true;
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
    return false;
  }
}

/**
 * Send an email notification
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials missing. Mocking email send to:", to);
      return { success: true, mock: true };
    }

    const info = await transporter.sendMail({
      from: `"Reddy Premium Dairy" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send an SMS notification
 */
export async function sendSMS(to: string, body: string) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("Twilio credentials missing. Mocking SMS send to:", to);
      return { success: true, mock: true };
    }

    // Ensure phone number has country code (rudimentary check, assume India if missing)
    let formattedPhone = to;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+91${formattedPhone}`;
    }

    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    
    console.log("SMS sent: %s", message.sid);
    return { success: true, messageId: message.sid };
  } catch (error: unknown) {
    console.error("Error sending SMS:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Trigger Order Confirmation Notifications
 */
export async function sendOrderConfirmation(order: Order, userEmail?: string) {
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoice/${order.id}`;
  
  // 1. Send SMS
  const smsBody = `Hi ${order.deliveryAddress.name}, your order ${order.id} for Rs. ${order.grandTotal.toFixed(2)} has been confirmed! Track it here: ${invoiceUrl} - Reddy Premium Dairy`;
  await sendSMS(order.deliveryAddress.phone, smsBody);

  // 2. Send Email if user has email
  if (userEmail) {
    const emailSubject = `Order Confirmed: ${order.id}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #10b981;">Order Confirmed!</h2>
        <p>Hi <strong>${order.deliveryAddress.name}</strong>,</p>
        <p>Thank you for choosing Reddy Premium Dairy. Your order <strong>${order.id}</strong> has been successfully placed.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Total Paid:</strong> Rs. ${order.grandTotal.toFixed(2)}</p>
          <p style="margin: 5px 0 0 0;"><strong>Delivery Slot:</strong> ${order.deliverySlot || 'Morning'}</p>
        </div>

        <p>You can track your order or download your invoice using the link below:</p>
        <a href="${invoiceUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">View Invoice & Track Order</a>
        
        <p style="margin-top: 30px; font-size: 12px; color: #64748b;">Freshness Delivered, Pure & Natural.<br>Reddy Premium Dairy Ltd.</p>
      </div>
    `;
    await sendEmail(userEmail, emailSubject, emailHtml);
  }
  // 3. Send FCM Push Notification
  try {
    const title = `Order Placed: ${order.id}`;
    const body = `Thank you for your order! Your order of Rs. ${order.grandTotal.toFixed(2)} is now pending confirmation.`;
    await sendPushNotification(order.userId, title, body);
  } catch (e) {
    console.error("FCM Send failed during order confirmation:", e);
  }
}

/**
 * Send an FCM Push Notification
 */
export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  // Save Notification in Local DB as well to keep dashboard lists in sync
  try {
    const notifId = `NOT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    db.notifications.create({
      id: notifId,
      userId,
      title,
      message: body,
      type: 'Order Updates',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Failed to save local DB notification:", e);
  }

  const initialized = initFirebaseAdmin();
  if (!initialized) {
    console.log(`[MOCK PUSH] Sent to User ${userId}: Title: "${title}", Body: "${body}"`);
    return { success: true, mock: true };
  }

  try {
    const user = db.users.getById(userId);
    if (!user || !user.fcmToken) {
      console.log(`Push skipped for User ${userId}: No registered FCM token.`);
      return { success: false, reason: 'No FCM token' };
    }

    const message = {
      notification: { title, body },
      data: data || {},
      token: user.fcmToken,
    };

    const response = await (admin as any).messaging().send(message);
    console.log("Successfully sent push notification:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
