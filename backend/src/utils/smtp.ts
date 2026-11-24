/**
 * SMTP utility for sending invoice emails
 * Uses nodemailer when SMTP environment variables are configured
 */
import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface EmailContent {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Get SMTP configuration from environment variables
 * Returns null if SMTP is not configured
 */
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    from,
  };
}

/**
 * Check if SMTP is configured
 */
export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

/**
 * Send email via SMTP
 * Throws error if SMTP is not configured or if sending fails
 */
export async function sendEmail(content: EmailContent): Promise<void> {
  const config = getSmtpConfig();
  
  if (!config) {
    throw new Error('SMTP is not configured');
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  // Send email
  await transporter.sendMail({
    from: config.from,
    to: content.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

/**
 * Generate invoice email content
 */
export function generateInvoiceEmail(
  invoiceId: string,
  amount: number,
  assetCode: string,
  memo: string,
  paymentUrl: string,
  customerName?: string
): EmailContent {
  const subject = `Invoice ${invoiceId.substring(0, 8).toUpperCase()} - ${amount} ${assetCode}`;
  
  const greeting = customerName ? `Hello ${customerName},` : 'Hello,';
  
  const text = `${greeting}

You have received an invoice from Quittance.

Invoice Details:
- Amount: ${amount} ${assetCode}
- Memo: ${memo}

Pay this invoice by visiting:
${paymentUrl}

This invoice was sent via Quittance, a Stellar blockchain payment platform.

---
Powered by Quittance
https://quittance-eosin.vercel.app`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #06b6d4; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .detail { margin: 10px 0; }
    .label { font-weight: 600; color: #666; }
    .value { color: #333; }
    .button { 
      display: inline-block; 
      background: #06b6d4; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💫 Quittance Invoice</h1>
    </div>
    
    <p>${greeting}</p>
    <p>You have received an invoice from Quittance.</p>
    
    <div class="content">
      <h2>Invoice Details</h2>
      <div class="detail">
        <span class="label">Amount:</span>
        <span class="value">${amount} ${assetCode}</span>
      </div>
      <div class="detail">
        <span class="label">Memo:</span>
        <span class="value">${memo}</span>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${paymentUrl}" class="button">Pay Invoice</a>
    </div>
    
    <p style="margin-top: 20px;">Or copy this link to your browser:</p>
    <p style="word-break: break-all; color: #0284c7;">${paymentUrl}</p>
    
    <div class="footer">
      <p>This invoice was sent via Quittance, a Stellar blockchain payment platform.</p>
      <p>Powered by Quittance</p>
    </div>
  </div>
</body>
</html>`;

  return {
    to: '',  // Will be set by caller
    subject,
    text,
    html,
  };
}
