// server/services/emailService.js

import nodemailer from "nodemailer";

const BASE_URL = process.env.CLIENT_URL || "http://localhost:5173";

async function sendEmail({ to, subject, html }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Vintora" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] Sent "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[email] Failed "${subject}" → ${to}:`, err.message);
  }
}

function emailShell(bodyContent) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f5efe0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe0;padding:32px 0;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8dfc8;">
  <tr><td style="background:#1a0a00;padding:24px 32px;text-align:center;">
    <span style="font-family:Georgia,serif;font-size:28px;color:#d4af6a;letter-spacing:2px;">Vint<span style="color:#fff;">ora</span></span>
    <p style="margin:4px 0 0;color:#b8963e;font-size:11px;letter-spacing:3px;">SUSTAINABLE FASHION</p>
  </td></tr>
  <tr><td style="padding:32px;">${bodyContent}</td></tr>
  <tr><td style="background:#f5efe0;padding:20px 32px;text-align:center;border-top:1px solid #e8dfc8;">
    <p style="margin:0;font-size:12px;color:#888;">© 2026 Vintora · Pakistan's Curated Fashion Rental & Resale Platform</p>
    <p style="margin:6px 0 0;font-size:12px;"><a href="${BASE_URL}" style="color:#b8963e;text-decoration:none;">Visit Vintora</a></p>
  </td></tr>
  </table></td></tr></table></body></html>`;
}

// 1. Welcome email on registration
export async function sendWelcomeEmail({ name, email }) {
  const html = emailShell(`
    <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">Welcome to Vintora, ${name}!</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 16px;">
      We're thrilled to have you join Pakistan's first AI-powered fashion rental and resale platform.
      Whether you're renting a stunning outfit for a wedding, selling pre-loved pieces, or building
      your Smart Closet — Vintora is here to make every occasion special.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:10px;background:#faf6ec;border-radius:6px;border-left:3px solid #b8963e;margin-bottom:8px;">
        <strong style="color:#1a0a00;">👗 Browse listings</strong>
        <p style="margin:4px 0 0;color:#666;font-size:13px;">Discover curated Pakistani outfits for rent or sale.</p>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>
      <tr><td style="padding:10px;background:#faf6ec;border-radius:6px;border-left:3px solid #b8963e;">
        <strong style="color:#1a0a00;">✨ Try AI Fashion Buddy</strong>
        <p style="margin:4px 0 0;color:#666;font-size:13px;">Tell us your occasion and get a complete outfit recommendation.</p>
      </td></tr>
    </table>
    <a href="${BASE_URL}/browse" style="display:inline-block;background:#1a0a00;color:#d4af6a;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">Start Browsing</a>
  `);
  await sendEmail({ to: email, subject: "Welcome to Vintora 🎉", html });
}

// 2. Booking request → notify seller
export async function sendBookingRequestEmail({ sellerEmail, sellerName, buyerName, itemTitle, startDate, endDate, totalPrice }) {
  const html = emailShell(`
    <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">New Booking Request</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Hi <strong>${sellerName}</strong>, you have a new booking request!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ec;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #e8dfc8;">
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Item:</strong></td><td style="color:#555;">${itemTitle}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Requested by:</strong></td><td style="color:#555;">${buyerName}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Dates:</strong></td><td style="color:#555;">${startDate} → ${endDate}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Total:</strong></td><td style="color:#b8963e;font-weight:bold;">Rs. ${Number(totalPrice).toLocaleString()}</td></tr>
    </table>
    <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#1a0a00;color:#d4af6a;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">Go to Dashboard</a>
  `);
  await sendEmail({ to: sellerEmail, subject: `New Booking Request — ${itemTitle}`, html });
}

// 3. Booking approved → notify buyer
export async function sendBookingApprovedEmail({ buyerEmail, buyerName, itemTitle, startDate, endDate, totalPrice, sellerName }) {
  const html = emailShell(`
    <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">Your Booking is Confirmed! 🎉</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Great news, <strong>${buyerName}</strong>! Your booking has been approved.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ec;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #e8dfc8;">
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Item:</strong></td><td style="color:#555;">${itemTitle}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Seller:</strong></td><td style="color:#555;">${sellerName}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Dates:</strong></td><td style="color:#555;">${startDate} → ${endDate}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Total:</strong></td><td style="color:#b8963e;font-weight:bold;">Rs. ${Number(totalPrice).toLocaleString()}</td></tr>
    </table>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Contact the seller via chat to arrange collection or delivery.</p>
    <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#1a0a00;color:#d4af6a;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">View My Bookings</a>
  `);
  await sendEmail({ to: buyerEmail, subject: `Booking Confirmed — ${itemTitle}`, html });
}

// 4. Booking rejected → notify buyer
export async function sendBookingRejectedEmail({ buyerEmail, buyerName, itemTitle, startDate, endDate }) {
  const html = emailShell(`
    <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">Booking Update</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Hi <strong>${buyerName}</strong>, unfortunately your booking request was not approved this time.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ec;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #e8dfc8;">
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Item:</strong></td><td style="color:#555;">${itemTitle}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Dates:</strong></td><td style="color:#555;">${startDate} → ${endDate}</td></tr>
    </table>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Don't worry — browse our catalogue to find a great alternative.</p>
    <a href="${BASE_URL}/browse" style="display:inline-block;background:#1a0a00;color:#d4af6a;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">Browse Alternatives</a>
  `);
  await sendEmail({ to: buyerEmail, subject: `Booking Update — ${itemTitle}`, html });
}

// 5. Listing approved by admin → notify seller
export async function sendListingApprovedEmail({ sellerEmail, sellerName, itemTitle }) {
  const html = emailShell(`
    <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">Your Listing is Live! ✅</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Hi <strong>${sellerName}</strong>, your listing has been approved and is now visible to buyers.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ec;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #e8dfc8;">
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Listing:</strong></td><td style="color:#555;">${itemTitle}</td></tr>
      <tr><td style="padding:6px 0;"><strong style="color:#1a0a00;">Status:</strong></td><td style="color:#2d6a2d;font-weight:bold;">Live ✓</td></tr>
    </table>
    <p style="color:#555;line-height:1.7;margin:0 0 20px;">Respond to booking requests promptly to build a great seller rating!</p>
    <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#1a0a00;color:#d4af6a;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;letter-spacing:1px;">View My Listings</a>
  `);
  await sendEmail({ to: sellerEmail, subject: `Your listing is live — ${itemTitle}`, html });
}

export async function sendVerificationEmail({ name, email, code }) {
  const html = emailShell(`
    <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">Verify your Vintora email</h2>
    <p style="color:#555;line-height:1.7;margin:0 0 16px;">
      Hi <strong>${name}</strong>, enter this code in Vintora to activate your account.
    </p>
    <div style="background:#faf6ec;border:1px solid #e8dfc8;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px;">
      <div style="font-size:30px;letter-spacing:8px;color:#1a0a00;font-weight:bold;">${code}</div>
      <p style="margin:10px 0 0;color:#777;font-size:13px;">This code expires in 15 minutes.</p>
    </div>
    <p style="color:#555;line-height:1.7;margin:0;">If you did not create a Vintora account, you can ignore this email.</p>
  `);
  await sendEmail({ to: email, subject: "Verify your Vintora email", html });
}
