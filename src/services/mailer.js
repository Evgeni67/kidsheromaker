// sendEmail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_ADDRESS,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  logger: true,
  debug: true,
});

transporter.verify((err, success) => {
  if (err) {
    console.error("Gmail SMTP configuration error:", err);
  } else {
    console.log("Gmail SMTP is ready to send messages:", success);
  }
});

async function sendVerificationEmail(toEmail, code) {
  const info = await transporter.sendMail({
    from: `"Kids Generations Code" <${process.env.GMAIL_ADDRESS}>`,
    to: toEmail,
    subject: "Your Email Verification Code",
    text: `Thank you for registering!\n\nYour verification code is: ${code}\n\nThis code will expire in 24 hours.\nIf you didn’t request this, you can ignore this email.`,
    html: `<div style="font-family:Arial, sans-serif; line-height:1.6;">
      <p>Thank you for registering!</p>
      <p>Your verification code is:</p>
      <h2>${code}</h2>
      <p>This code will expire in 24 hours.</p>
      <p>If you didn’t request this, you can ignore this email.</p>
    </div>`,
  });
  console.log("Verification email sent:", info.messageId, info.response);
  return info;
}

// NEW: purchase email for admin
async function sendPurchaseEmail({ adminEmail, order, stripeSession }) {
  const to = 'evgenigyurovtech@gmail.com';

  const money = (amt, cur) => {
    if (amt == null || !cur) return 'n/a';
    return `${(amt / 100).toFixed(2)} ${cur.toUpperCase()}`;
    // NOTE: Stripe amounts are in minor units
  };

  const plain = [
    'New Book Purchase',
    '',
    `User ID: ${order.userId}`,
    `User Email: ${order.userEmail}`,
    `Payment: ${order.paymentMethod}`,
    `Material: ${order.material}`,
    `Quantity: ${order.quantity}`,
    `Amount: ${money(order.totals?.amount_total ?? stripeSession?.amount_total, order.totals?.currency ?? stripeSession?.currency)}`,
    '',
    'Shipping Address:',
    `  Full Name: ${order.address.fullName}`,
    `  Phone: ${order.address.phone}`,
    `  Country: ${order.address.country}`,
    `  City: ${order.address.city}`,
    `  ZIP: ${order.address.zip}`,
    `  Address 1: ${order.address.line1}`,
    `  Address 2: ${order.address.line2 || ''}`,
    `  Notes: ${order.address.notes || ''}`,
    '',
    `Stripe Session: ${order.stripeSessionId || stripeSession?.id || 'n/a'}`,
    `Created At: ${order.createdAt}`,
  ].join('\n');

  const html = `
  <div style="font-family:Arial, sans-serif; line-height:1.6; color:#0f172a;">
    <h2 style="margin:0 0 12px;">New Book Purchase</h2>
    <table cellspacing="0" cellpadding="6" style="border-collapse:collapse;">
      <tr><td><b>User ID</b></td><td>${escapeHtml(order.userId)}</td></tr>
      <tr><td><b>User Email</b></td><td>${escapeHtml(order.userEmail)}</td></tr>
      <tr><td><b>Payment</b></td><td>${escapeHtml(order.paymentMethod)}</td></tr>
      <tr><td><b>Material</b></td><td>${escapeHtml(order.material)}</td></tr>
      <tr><td><b>Quantity</b></td><td>${escapeHtml(String(order.quantity))}</td></tr>
      <tr><td><b>Amount</b></td><td>${escapeHtml(money(order.totals?.amount_total ?? stripeSession?.amount_total, order.totals?.currency ?? stripeSession?.currency))}</td></tr>
    </table>
    <h3 style="margin:16px 0 8px;">Shipping Address</h3>
    <table cellspacing="0" cellpadding="6" style="border-collapse:collapse;">
      <tr><td><b>Full Name</b></td><td>${escapeHtml(order.address.fullName)}</td></tr>
      <tr><td><b>Phone</b></td><td>${escapeHtml(order.address.phone)}</td></tr>
      <tr><td><b>Country</b></td><td>${escapeHtml(order.address.country)}</td></tr>
      <tr><td><b>City</b></td><td>${escapeHtml(order.address.city)}</td></tr>
      <tr><td><b>ZIP</b></td><td>${escapeHtml(order.address.zip)}</td></tr>
      <tr><td><b>Address 1</b></td><td>${escapeHtml(order.address.line1)}</td></tr>
      <tr><td><b>Address 2</b></td><td>${escapeHtml(order.address.line2 || '')}</td></tr>
      <tr><td><b>Notes</b></td><td>${escapeHtml(order.address.notes || '')}</td></tr>
    </table>
    <p style="font-size:12px;color:#6b7280;margin-top:12px;">
      Stripe Session: ${escapeHtml(order.stripeSessionId || stripeSession?.id || 'n/a')}<br/>
      Created At: ${escapeHtml(order.createdAt)}
    </p>
  </div>`.trim();

  const info = await transporter.sendMail({
    from: `"Kids Hero Maker Orders" <${process.env.GMAIL_ADDRESS}>`,
    to,
    subject: `New Book Order - ${order.material} x${order.quantity} (${order.paymentMethod.toUpperCase()})`,
    text: plain,
    html,
    replyTo: order.userEmail || undefined,
  });

  console.log('Order email sent:', info.messageId, info.response);
  return info;
}

function escapeHtml(v = '') {
  return String(v).replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
}

// Existing helper (unchanged)
async function sendTechSoftLead(form) {
  // ... (keep your existing implementation)
}

module.exports = {
  sendVerificationEmail,
  sendPurchaseEmail,   // ⬅️ NEW export
  sendTechSoftLead,
};
