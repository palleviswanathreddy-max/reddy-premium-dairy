import nodemailer from 'nodemailer';

export async function sendEmailOTP(toEmail: string, otpCode: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { success: false, error: 'Email SMTP not configured. Set SMTP_USER and SMTP_PASS in .env.local' };
  }

  try {
    console.log("SMTP USER:", process.env.SMTP_USER);
    console.log("SMTP PASS:", process.env.SMTP_PASS);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"REDDY PREMIUM DAIRY" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Your REDDY PREMIUM DAIRY Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B2545; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #F5C842; font-size: 24px; margin: 0;">REDDY PREMIUM DAIRY</h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 4px 0;">Pure • Fresh • Healthy</p>
          </div>
          <div style="background: #1e293b; border-radius: 12px; padding: 30px; text-align: center;">
            <p style="color: #e2e8f0; font-size: 16px; margin-bottom: 20px;">Your verification code is:</p>
            <div style="background: #0B2545; border: 2px solid #F5C842; border-radius: 12px; padding: 20px; display: inline-block; margin: 0 auto;">
              <span style="color: #F5C842; font-size: 42px; font-weight: bold; letter-spacing: 12px;">${otpCode}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 20px;">This code expires in <strong style="color: #F5C842;">5 minutes</strong>.</p>
            <p style="color: #64748b; font-size: 11px; margin-top: 10px;">Do not share this code with anyone.</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #475569; font-size: 11px;">Chiyyedu Village, Anantapur District, Andhra Pradesh – 515751</p>
            <p style="color: #475569; font-size: 11px;">© 2026 REDDY PREMIUM DAIRY. All Rights Reserved.</p>
          </div>
        </div>
      `
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Email OTP Error]', err.message);
    return { success: false, error: err.message };
  }
}
