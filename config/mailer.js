/**
 * config/mailer.js — NeuGlow Email System
 * Fetches SMTP config from app.locals.cfg and sends transactional emails.
 */

const nodemailer = require('nodemailer');

function createTransport(cfg) {
  return nodemailer.createTransport({
    host: cfg.smtpHost || 'smtp.gmail.com',
    port: cfg.smtpPort || 587,
    secure: false,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPass,
    },
  });
}

// ── Base email template ───────────────────────────────────────────────────────
function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#F8F4EE; font-family:'Helvetica Neue',Arial,sans-serif; color:#2C1810; }
    .wrapper { max-width:600px; margin:0 auto; padding:40px 20px; }
    .header { background:#1A1208; border-radius:16px 16px 0 0; padding:32px 40px; text-align:center; }
    .logo { font-size:28px; font-weight:300; color:#E8520A; letter-spacing:-0.02em; }
    .logo span { color:#F8F4EE; }
    .body { background:#fff; padding:40px; border-left:1px solid rgba(232,82,10,0.15); border-right:1px solid rgba(232,82,10,0.15); }
    .footer { background:#1A1208; border-radius:0 0 16px 16px; padding:24px 40px; text-align:center; }
    .footer p { color:rgba(248,244,238,0.4); font-size:12px; margin:4px 0; }
    h1 { font-size:24px; font-weight:300; color:#1A1208; margin:0 0 16px; }
    h1 em { color:#E8520A; font-style:italic; }
    p { font-size:15px; line-height:1.7; color:#5C3D1E; margin:0 0 16px; }
    .btn { display:inline-block; background:#E8520A; color:#fff; text-decoration:none; padding:14px 32px; border-radius:100px; font-size:14px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; margin:8px 0; }
    .divider { border:none; border-top:1px solid rgba(232,82,10,0.12); margin:28px 0; }
    .badge { display:inline-block; background:rgba(232,82,10,0.1); border:1px solid rgba(232,82,10,0.2); color:#E8520A; padding:4px 14px; border-radius:100px; font-size:12px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; }
    .order-table { width:100%; border-collapse:collapse; margin:20px 0; }
    .order-table th { background:#F8F4EE; padding:10px 14px; text-align:left; font-size:11px; font-weight:700; color:#5C3D1E; letter-spacing:0.08em; text-transform:uppercase; }
    .order-table td { padding:12px 14px; border-bottom:1px solid rgba(232,82,10,0.08); font-size:14px; }
    .order-total { display:flex; justify-content:space-between; padding:14px 0; border-top:2px solid rgba(232,82,10,0.15); font-weight:700; font-size:16px; color:#1A1208; }
    .highlight { color:#E8520A; font-weight:600; }
    .info-box { background:#F8F4EE; border-radius:12px; padding:20px 24px; margin:20px 0; }
    .info-box p { margin:4px 0; font-size:14px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Neu<span>Glow</span></div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>NeuGlow — Powered by Delta M+ Technology</p>
      <p>Illuminating cognitive wellness through the science of light.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Email: Welcome ────────────────────────────────────────────────────────────
function welcomeEmail(user) {
  return {
    subject: `Welcome to NeuGlow, ${user.name.split(' ')[0]}! 🧠`,
    html: baseTemplate(`
      <h1>Welcome to <em>NeuGlow</em></h1>
      <p>Hi ${user.name.split(' ')[0]},</p>
      <p>Thank you for joining the NeuGlow community! You're now part of a growing group of people using 40Hz Gamma light technology to support brain health and cognitive wellness.</p>
      <hr class="divider">
      <p><strong>What is NeuGlow?</strong><br>
      Our lamps use MIT-researched 40Hz light therapy to support memory, focus, and long-term brain health — effortlessly, during your normal daily routine.</p>
      <p style="text-align:center;margin-top:28px;">
        <a href="http://localhost:3000/#products" class="btn">Shop Now →</a>
      </p>
      <hr class="divider">
      <p style="font-size:13px;color:#BCA98A;">Questions? Reply to this email — we're happy to help.</p>
    `),
  };
}

// ── Email: Order Confirmation (to buyer) ──────────────────────────────────────
function orderConfirmationEmail(order, user) {
  const itemRows = order.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">$${(i.price * i.qty).toFixed(2)}</td>
    </tr>`).join('');

  return {
    subject: `Order Confirmed — ${order.orderNumber} 🎉`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:48px;margin-bottom:12px;">🎉</div>
        <span class="badge">Order Confirmed</span>
      </div>
      <h1>Your order is <em>confirmed!</em></h1>
      <p>Hi ${user.name.split(' ')[0]}, thank you for your purchase! Your NeuGlow order has been received and is being processed.</p>

      <div class="info-box">
        <p><strong>Order Number:</strong> <span class="highlight">${order.orderNumber}</span></p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
      </div>

      <table class="order-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="padding:0 0 8px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#5C3D1E;">
          <span>Subtotal</span><span>$${order.subtotal?.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#5C3D1E;">
          <span>Tax</span><span>$${order.tax?.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:14px 0;border-top:2px solid rgba(232,82,10,0.15);font-weight:700;font-size:16px;">
          <span>Total</span><span style="color:#E8520A;">$${order.total?.toFixed(2)}</span>
        </div>
      </div>

      ${order.shippingAddress?.line1 ? `
      <div class="info-box">
        <p><strong>Shipping to:</strong></p>
        <p>${order.shippingAddress.name || ''}<br>
        ${order.shippingAddress.line1}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.zip}</p>
      </div>` : ''}

      <p style="font-size:13px;color:#BCA98A;margin-top:24px;">You'll receive another email when your order ships with tracking information.</p>
    `),
  };
}

// ── Email: New Order Alert (to admin) ─────────────────────────────────────────
function adminOrderEmail(order, user) {
  const itemRows = order.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">$${(i.price * i.qty).toFixed(2)}</td>
    </tr>`).join('');

  return {
    subject: `🛍️ New Order — ${order.orderNumber} ($${order.total?.toFixed(2)})`,
    html: baseTemplate(`
      <span class="badge">New Order</span>
      <h1>New order <em>received!</em></h1>

      <div class="info-box">
        <p><strong>Order:</strong> <span class="highlight">${order.orderNumber}</span></p>
        <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
        <p><strong>Total:</strong> <span class="highlight">$${order.total?.toFixed(2)}</span></p>
        <p><strong>Status:</strong> ${order.status}</p>
      </div>

      <table class="order-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      ${order.shippingAddress?.line1 ? `
      <div class="info-box">
        <p><strong>Ship to:</strong></p>
        <p>${order.shippingAddress.name || ''}<br>
        ${order.shippingAddress.line1}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.zip}</p>
      </div>` : ''}

      <p style="text-align:center;margin-top:24px;">
        <a href="http://localhost:3000/admin" class="btn">View in Admin →</a>
      </p>
    `),
  };
}

// ── Email: Order Shipped ──────────────────────────────────────────────────────
function orderShippedEmail(order, user) {
  return {
    subject: `Your NeuGlow is on its way! 📦 — ${order.orderNumber}`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:48px;margin-bottom:12px;">📦</div>
        <span class="badge">Shipped</span>
      </div>
      <h1>Your order is <em>on its way!</em></h1>
      <p>Hi ${user.name.split(' ')[0]}, great news — your NeuGlow has been shipped!</p>

      <div class="info-box">
        <p><strong>Order:</strong> <span class="highlight">${order.orderNumber}</span></p>
        ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> <span class="highlight">${order.trackingNumber}</span></p>` : ''}
        <p><strong>Status:</strong> Shipped</p>
      </div>

      <p>Your package should arrive within 5–10 business days depending on your location.</p>

      <p style="font-size:13px;color:#BCA98A;margin-top:24px;">Questions about your shipment? Reply to this email and we'll help you track it down.</p>
    `),
  };
}

// ── Send function ─────────────────────────────────────────────────────────────
async function sendMail(cfg, to, emailData) {
  if (!cfg?.smtpUser || !cfg?.smtpPass) {
    console.log('⚠️  Email skipped — SMTP not configured');
    return;
  }
  try {
    const transporter = createTransport(cfg);
    await transporter.sendMail({
      from: `"${cfg.storeName || 'NeuGlow'}" <${cfg.smtpFrom || cfg.smtpUser}>`,
      to,
      subject: emailData.subject,
      html: emailData.html,
    });
    console.log(`✉️  Email sent to ${to}: ${emailData.subject}`);
  } catch (e) {
    console.error(`❌ Email failed to ${to}:`, e.message);
  }
}

module.exports = {
  sendMail,
  welcomeEmail,
  orderConfirmationEmail,
  adminOrderEmail,
  orderShippedEmail,
};