import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { Order } from '@/db/db';

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
}
