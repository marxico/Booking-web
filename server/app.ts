require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const { port, publicDir, frontendDistDir, siteUrl, allTimes, appointmentStatuses, admin, square, turnstile } = require('./config/appConfig');
const { all, get, run, ensureSchema } = require('./db');
const logger = require('./utils/logger');
const {
  createAdminSession,
  getValidSessionToken,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  deleteSession
} = require('./services/adminSessions');
const {
  authenticateAdminUser,
  authenticateGoogleAdminUser,
  buildSessionUser,
  canUseGoogleLogin,
  createAdminUser,
  listAdminUsers,
  recordAdminLogin,
  updateAdminUser
} = require('./services/adminUsers');
const {
  validateAdminIdentifier,
  validateAdminProfileInput,
  validateAppointmentDate,
  validateBookingPayloadStrict,
  validateLoginPassword,
  validatePassword
} = require('./services/validation');
const { formatMoney, getAllPricing, getPublicPricing, getPublicPricingVersion, getBookingFee, updatePricing } = require('./services/pricingService');
const {
  contactEmailHash,
  contactPhoneHash,
  decryptField,
  encryptField,
  hasEncryptionKey
} = require('./services/secureFields');
const {
  isSquareMode,
  paymentMode,
  paymentEnabled,
  paymentProviderLabel,
  createPayment
} = require('./services/payments');

import type { AppError, AppointmentRow, AdminPermission, AdminRole } from './types';

const app = express();
const loginAttempts = new Map();
const bookingAttempts = new Map();
const clientLogAttempts = new Map();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  const cspNonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = cspNonce;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: https://*.googleusercontent.com",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'nonce-${cspNonce}' https://web.squarecdn.com https://sandbox.web.squarecdn.com https://accounts.google.com/gsi/client https://challenges.cloudflare.com`,
      "connect-src 'self' https://connect.squareup.com https://connect.squareupsandbox.com https://oauth2.googleapis.com https://challenges.cloudflare.com",
      "frame-src https://web.squarecdn.com https://sandbox.web.squarecdn.com https://accounts.google.com https://challenges.cloudflare.com"
    ].join('; ')
  );
  next();
});
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip
    });
  });

  next();
});

const mapDatabaseError = (error, fallbackMessage) => {
  if (!error) {
    return fallbackMessage;
  }

  if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
    return 'The Lawson scheduling database is locked. Save and close your SQLite editor, then try again.';
  }

  if (String(error.message || '').includes('UNIQUE constraint failed')) {
    return 'That record already exists.';
  }

  return fallbackMessage;
};

const assertProductionConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const weakAdminPasswords = new Set(['admin', 'password', 'change-me-admin', 'changeme', '12345678']);

  if (weakAdminPasswords.has(String(admin.password || '').trim().toLowerCase())) {
    throw new Error('Production startup blocked: set ADMIN_PASSWORD to a strong unique password.');
  }

  if (!paymentEnabled) {
    throw new Error('Production startup blocked: configure real Square credentials before accepting bookings.');
  }

  if (!hasEncryptionKey()) {
    throw new Error('Production startup blocked: set DATA_ENCRYPTION_KEY to at least 32 random characters.');
  }
};

const verifyTurnstileToken = async ({ token, ip }) => {
  if (!turnstile.secretKey) {
    return;
  }

  if (!token) {
    const error = new Error('Human verification is required before booking.') as AppError;
    error.statusCode = 400;
    throw error;
  }

  const formData = new URLSearchParams({
    secret: turnstile.secretKey,
    response: token
  });

  if (ip) {
    formData.set('remoteip', ip);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

  const result = await response.json() as { success?: boolean };

  if (!response.ok || !result.success) {
    const error = new Error('Human verification failed. Please refresh and try again.') as AppError;
    error.statusCode = 400;
    throw error;
  }
};

const getCurrentAdminUser = (req) => getSessionUser(req);

const requireAdminAuth = (req, res, next) => {
  const user = getCurrentAdminUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.adminUser = user;
  next();
};

const requirePermission = (permission: AdminPermission) => (req, res, next) => {
  const user = req.adminUser || getCurrentAdminUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!user.permissions.includes(permission)) {
    return res.status(403).json({ error: 'You do not have permission for this action.' });
  }

  req.adminUser = user;
  next();
};

const getRequestOrigin = (req) => {
  const origin = req.get('origin');

  if (origin) {
    return origin;
  }

  const referer = req.get('referer');

  if (!referer) {
    return '';
  }

  try {
    return new URL(referer).origin;
  } catch (error) {
    return '';
  }
};

const requireSameOrigin = (req, res, next) => {
  const requestOrigin = getRequestOrigin(req);

  if (!requestOrigin) {
    return next();
  }

  const expectedOrigin = `${req.protocol}://${req.get('host')}`;

  if (requestOrigin !== expectedOrigin) {
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }

  next();
};

const safeEqual = (left = '', right = '') => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getLoginAttemptKey = (req) => req.ip || req.socket.remoteAddress || 'unknown';

const checkLoginRateLimit = (req, res, next) => {
  const key = getLoginAttemptKey(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 8;
  const existing = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (existing.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + windowMs });
    return next();
  }

  if (existing.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  next();
};

const recordFailedLoginAttempt = (req) => {
  const key = getLoginAttemptKey(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const existing = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (existing.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  loginAttempts.set(key, {
    count: existing.count + 1,
    resetAt: existing.resetAt
  });
};

const clearLoginAttempts = (req) => {
  loginAttempts.delete(getLoginAttemptKey(req));
};

const checkBookingRateLimit = (req, res, next) => {
  const key = getLoginAttemptKey(req);
  const now = Date.now();
  const windowMs = 30 * 60 * 1000;
  const maxAttempts = 3;
  const existing = bookingAttempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (existing.resetAt <= now) {
    bookingAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (existing.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many booking attempts. Please wait a few minutes and try again.' });
  }

  bookingAttempts.set(key, {
    count: existing.count + 1,
    resetAt: existing.resetAt
  });

  next();
};

const checkClientLogRateLimit = (req, res, next) => {
  const key = getLoginAttemptKey(req);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 120;
  const existing = clientLogAttempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (existing.resetAt <= now) {
    clientLogAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (existing.count >= maxAttempts) {
    return res.status(202).json({ accepted: false });
  }

  clientLogAttempts.set(key, {
    count: existing.count + 1,
    resetAt: existing.resetAt
  });

  next();
};

const getAppointmentBySlot = (date, time) => get(
  "SELECT * FROM appointments WHERE date = ? AND time = ? AND status != 'canceled'",
  [date, time]
);

const getActiveBookingCountForContact = async ({ phone, email }) => {
  const phoneHash = contactPhoneHash(phone);
  const emailHash = contactEmailHash(email);
  const row = await get(
    `SELECT COUNT(*) AS count
     FROM appointments
     WHERE status != 'canceled'
       AND (contact_phone_hash = ? OR contact_email_hash = ?)`,
    [phoneHash, emailHash]
  );

  return Number(row?.count || 0);
};

const getActiveBookingCountForContactOnDate = async ({ phone, email, date }) => {
  const phoneHash = contactPhoneHash(phone);
  const emailHash = contactEmailHash(email);
  const row = await get(
    `SELECT COUNT(*) AS count
     FROM appointments
     WHERE status != 'canceled'
       AND date = ?
       AND (contact_phone_hash = ? OR contact_email_hash = ?)`,
    [date, phoneHash, emailHash]
  );

  return Number(row?.count || 0);
};

const createBooking = async ({ name, phone, email, vehicle, service, date, time, company, sourceId }) => {
  const bookingFee = await getBookingFee();
  ({ name, phone, email, vehicle, service, date, time } = validateBookingPayloadStrict({ name, phone, email, vehicle, service, date, time, company }));

  if (!allTimes.includes(time)) {
    const error = new Error('Invalid appointment time') as AppError;
    error.statusCode = 400;
    throw error;
  }

  if (!paymentEnabled) {
    const error = new Error('Online booking is disabled until Square production credentials are configured.') as AppError;
    error.statusCode = 503;
    throw error;
  }

  if (bookingFee.priceCents > 0 && !sourceId) {
    const error = new Error('Payment is required before this appointment can be reserved') as AppError;
    error.statusCode = 400;
    throw error;
  }

  const existingAppointment = await getAppointmentBySlot(date, time);

  if (existingAppointment) {
    const error = new Error('This Lawson service slot is no longer available') as AppError;
    error.statusCode = 400;
    throw error;
  }

  const contactBookingsForDate = await getActiveBookingCountForContactOnDate({ phone, email, date });

  if (contactBookingsForDate >= 1) {
    const error = new Error('You already have an active booking request for this date. Please call us to change it.') as AppError;
    error.statusCode = 400;
    throw error;
  }

  const activeContactBookings = await getActiveBookingCountForContact({ phone, email });

  if (activeContactBookings >= 2) {
    const error = new Error('You already have active booking requests. Please call us to schedule another appointment.') as AppError;
    error.statusCode = 429;
    throw error;
  }

  let paymentStatus = 'not_required';
  let paymentAmountCents = 0;
  let squarePaymentId = null;
  let squareOrderId = null;
  let squareReceiptUrl = null;
  let bookingSource = 'manual';

  if (bookingFee.priceCents > 0) {
    const payment = await createPayment({
      sourceId,
      amountCents: bookingFee.priceCents,
      referenceId: `${date}-${time}`,
      note: `Lawson booking ${date} ${time}: ${service}`
    });

    paymentStatus = 'paid';
    paymentAmountCents = bookingFee.priceCents;
    squarePaymentId = payment?.id || null;
    squareOrderId = payment?.orderId || null;
    squareReceiptUrl = payment?.receiptUrl || null;
    bookingSource = paymentMode;
  }

  const secureFields = encryptAppointmentFields({ name, phone, email, vehicle });
  const result = await run(
    `INSERT INTO appointments
     (name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, square_receipt_url, booking_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      secureFields.name,
      secureFields.phone,
      secureFields.email,
      secureFields.contact_email_hash,
      secureFields.contact_phone_hash,
      secureFields.vehicle_details,
      service,
      date,
      time,
      'pending',
      paymentStatus,
      paymentAmountCents,
      squarePaymentId,
      squareOrderId,
      squareReceiptUrl,
      bookingSource
    ]
  );

  return {
    appointmentId: result.lastID,
    paymentStatus,
    receiptUrl: squareReceiptUrl,
    serviceCallOutFeeFormatted: bookingFee.priceFormatted,
    message: bookingFee.priceCents > 0
      ? `Thanks, ${name}. Your ${bookingFee.priceFormatted} booking payment was approved and your ${service} request for ${date} at ${time} is pending review.`
      : `Thanks, ${name}. Lawson Mobile Mechanic received your ${service} request for ${date} at ${time}.`
  };
};

const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();
const normalizeText = (value) => String(value || '').trim();

const encryptAppointmentFields = ({ name, phone, email, vehicle }) => ({
  name: encryptField(name),
  phone: encryptField(phone),
  email: encryptField(email),
  vehicle_details: encryptField(vehicle),
  contact_email_hash: contactEmailHash(email),
  contact_phone_hash: contactPhoneHash(phone)
});

const decryptAppointmentRow = (row) => row ? ({
  ...row,
  name: decryptField(row.name),
  phone: decryptField(row.phone),
  email: decryptField(row.email),
  vehicle_details: decryptField(row.vehicle_details)
}) : row;

const decryptAppointmentRows = (rows) => rows.map(decryptAppointmentRow);

const roleLabels: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  analyst: 'Analyst',
  viewer: 'Viewer'
};

const validRoles = Object.keys(roleLabels);

const normalizeRole = (role: string): AdminRole | null => {
  const value = String(role || '').trim().toLowerCase();
  return validRoles.includes(value) ? (value as AdminRole) : null;
};

const verifyGoogleCredential = async (credential) => {
  if (!canUseGoogleLogin()) {
    const error = new Error('Google sign-in is not enabled yet.') as AppError;
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(credential || ''))}`);
  const result = await response.json();

  if (!response.ok) {
    const error = new Error('Could not verify the Google login token.') as AppError;
    error.statusCode = 401;
    throw error;
  }

  if (!safeEqual(result.aud, admin.googleClientId)) {
    const error = new Error('Google login token is not for this app.') as AppError;
    error.statusCode = 401;
    throw error;
  }

  if (result.email_verified !== 'true') {
    const error = new Error('Google account email must be verified.') as AppError;
    error.statusCode = 401;
    throw error;
  }

  return {
    email: normalizeIdentifier(result.email),
    googleSubject: normalizeText(result.sub),
    name: normalizeText(result.name || result.email)
  };
};

const getAdminAnalytics = async () => {
  const appointments = decryptAppointmentRows(await all(
    `SELECT id, name, phone, email, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents,
            square_payment_id, square_order_id, square_receipt_url, booking_source
     FROM appointments
     ORDER BY date ASC, time ASC`
  ) as AppointmentRow[]);
  const history = decryptAppointmentRows(await all(
    `SELECT id, appointment_id, name, phone, email, vehicle_details, service_requested, date, time, status, payment_status,
            payment_amount_cents, square_payment_id, square_order_id, action, recorded_at
     FROM appointment_history
     ORDER BY recorded_at DESC`
  ) as AppointmentRow[]);

  const upcoming = appointments.filter((appointment) => appointment.status !== 'canceled');
  const accepted = appointments.filter((appointment) => appointment.status === 'accepted');
  const pending = appointments.filter((appointment) => appointment.status === 'pending');
  const canceledCurrent = appointments.filter((appointment) => appointment.status === 'canceled');
  const canceledHistoric = history.filter((item) => item.status === 'canceled' || item.action === 'canceled');
  const totalRevenueCents = [...appointments, ...history]
    .filter((item) => item.payment_status === 'paid')
    .reduce((sum, item) => sum + Number(item.payment_amount_cents || 0), 0);

  const sourceSummary = [...appointments, ...history].reduce((summary, item) => {
    const source = item.booking_source || item.action || 'manual';
    summary[source] = (summary[source] || 0) + 1;
    return summary;
  }, {});

  const dailyLoad = upcoming.reduce((summary, appointment) => {
    summary[appointment.date] = (summary[appointment.date] || 0) + 1;
    return summary;
  }, {});

  const busiestDay = Object.entries(dailyLoad)
    .sort((left, right) => Number(right[1]) - Number(left[1]))[0];

  const recentBookings = [...appointments]
    .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`))
    .slice(0, 5);

  return {
    summary: [
      { label: 'Active requests', value: String(upcoming.length), detail: `${pending.length} pending review` },
      {
        label: 'Accepted jobs',
        value: String(accepted.length),
        detail: `${upcoming.length ? Math.round((accepted.length / upcoming.length) * 100) : 0}% of active pipeline`
      },
      {
        label: 'Canceled records',
        value: String(canceledCurrent.length + canceledHistoric.length),
        detail: `${canceledHistoric.length} archived`
      },
      {
        label: 'Revenue captured',
        value: formatMoney(totalRevenueCents),
        detail: `${[...appointments, ...history].filter((item) => item.payment_status === 'paid').length} paid bookings`
      }
    ],
    trends: {
      busiestDay: busiestDay ? { date: busiestDay[0], count: busiestDay[1] } : null,
      sourceSummary,
      upcomingCount: upcoming.length
    },
    breakdown: {
      pending: pending.length,
      accepted: accepted.length,
      canceled: canceledCurrent.length + canceledHistoric.length,
      history: history.length
    },
    recentBookings
  };
};

app.get('/pricing', async (req, res) => {
  try {
    const pricing = await getPublicPricing();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ pricing });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not load pricing.') });
  }
});

app.get('/pricing/version', async (req, res) => {
  try {
    const version = await getPublicPricingVersion();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ version });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not load pricing version.') });
  }
});

app.get('/square/config', async (req, res) => {
  try {
    const bookingFee = await getBookingFee();

    res.json({
      enabled: paymentEnabled,
      paymentMode,
      paymentProviderLabel,
      environment: square.environment,
      appId: paymentEnabled && isSquareMode ? square.appId : '',
      locationId: paymentEnabled && isSquareMode ? square.locationId : '',
      currency: square.currency,
      paymentRequired: bookingFee.priceCents > 0,
      serviceCallOutFeeName: bookingFee.name,
      serviceCallOutFeeCents: bookingFee.priceCents,
      serviceCallOutFeeFormatted: bookingFee.priceFormatted,
      turnstileSiteKey: turnstile.siteKey
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not load Square payment settings.' });
  }
});

app.get('/healthz', async (req, res) => {
  try {
    await get('SELECT 1 AS ok');
    res.json({
      ok: true,
      paymentProvider: paymentProviderLabel,
      squareConfigured: paymentEnabled,
      turnstileConfigured: Boolean(turnstile.secretKey)
    });
  } catch (error) {
    res.status(503).json({ ok: false });
  }
});

const publicSeoPaths = [
  '/',
  '/mobile-mechanic-memphis',
  '/services',
  '/brake-repair-memphis',
  '/battery-replacement-memphis',
  '/oil-change-memphis',
  '/car-diagnostics-memphis',
  '/roadside-assistance-memphis',
  '/promotions',
  '/book'
];

const seoPages = {
  '/': {
    title: 'Lawson Mobile Mechanic | Mobile Auto Repair in Memphis',
    description: 'Book mobile mechanic service in Memphis for diagnostics, brakes, battery, oil changes, and roadside help.',
    keywords: 'mobile mechanic Memphis, mobile auto repair Memphis, on site mechanic Memphis',
    priority: '1.0',
    changefreq: 'weekly'
  },
  '/mobile-mechanic-memphis': {
    title: 'Mobile Mechanic Memphis | Lawson Mobile Mechanic',
    description: 'On-site auto repair in Memphis, Germantown, Bartlett, Collierville, Cordova, Southaven, and Olive Branch.',
    keywords: 'mobile mechanic Memphis, mechanic near me Memphis, mobile auto repair near me',
    priority: '0.95',
    changefreq: 'weekly'
  },
  '/services': {
    title: 'Mobile Auto Repair Services in Memphis | Lawson Mobile Mechanic',
    description: 'Explore mobile brake repair, battery service, oil changes, diagnostics, and roadside assistance around Memphis.',
    keywords: 'mobile auto repair services Memphis, mobile car repair Memphis',
    priority: '0.9',
    changefreq: 'weekly'
  },
  '/brake-repair-memphis': {
    title: 'Mobile Brake Repair Memphis | Lawson Mobile Mechanic',
    description: 'Book mobile brake inspections, pads, rotors, and brake noise checks with Lawson Mobile Mechanic.',
    keywords: 'mobile brake repair Memphis, brake pads Memphis, brake mechanic Memphis',
    priority: '0.85',
    changefreq: 'weekly'
  },
  '/battery-replacement-memphis': {
    title: 'Mobile Battery Replacement Memphis | Lawson Mobile Mechanic',
    description: 'Get mobile battery testing, replacement planning, jump-start support, and charging system checks.',
    keywords: 'mobile battery replacement Memphis, car battery service Memphis, jump start Memphis',
    priority: '0.85',
    changefreq: 'weekly'
  },
  '/oil-change-memphis': {
    title: 'Mobile Oil Change Memphis | Lawson Mobile Mechanic',
    description: 'Schedule mobile oil and filter service with fluid checks at home, work, or your parking location.',
    keywords: 'mobile oil change Memphis, oil change at home Memphis, mobile maintenance Memphis',
    priority: '0.85',
    changefreq: 'weekly'
  },
  '/car-diagnostics-memphis': {
    title: 'Mobile Car Diagnostics Memphis | Lawson Mobile Mechanic',
    description: 'Book mobile diagnostics for check engine lights, no-start issues, warning lights, leaks, and strange sounds.',
    keywords: 'mobile car diagnostics Memphis, check engine light Memphis, no start diagnostic Memphis',
    priority: '0.85',
    changefreq: 'weekly'
  },
  '/roadside-assistance-memphis': {
    title: 'Roadside Assistance Memphis | Lawson Mobile Mechanic',
    description: 'Request mobile roadside mechanic help for urgent vehicle issues around Memphis and nearby areas.',
    keywords: 'roadside assistance Memphis, mobile roadside mechanic Memphis, emergency mechanic Memphis',
    priority: '0.85',
    changefreq: 'weekly'
  },
  '/promotions': {
    title: 'Mobile Mechanic Promotions Memphis | Lawson Mobile Mechanic',
    description: 'See current online booking offers for diagnostics, brake service, and mobile auto repair in Memphis.',
    keywords: 'mechanic promotions Memphis, auto repair coupons Memphis, mobile mechanic deals Memphis',
    priority: '0.75',
    changefreq: 'weekly'
  },
  '/book': {
    title: 'Book a Mobile Mechanic in Memphis | Lawson Mobile Mechanic',
    description: 'Reserve a mobile mechanic appointment online with secure payment and live appointment availability.',
    keywords: 'book mobile mechanic Memphis, schedule mechanic Memphis, mobile mechanic appointment',
    priority: '0.95',
    changefreq: 'daily'
  }
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const publicServiceSchema = [
  'Mobile brake repair',
  'Mobile battery replacement',
  'Mobile oil change',
  'Mobile car diagnostics',
  'Roadside mechanic assistance'
];

const publicAreaServed = [
  'Memphis',
  'Germantown',
  'Bartlett',
  'Collierville',
  'Cordova',
  'Southaven',
  'Olive Branch',
  'Lakeland'
];

const buildStructuredData = (route, page) => {
  const canonicalUrl = `${siteUrl}${route === '/' ? '' : route}`;
  const imageUrl = `${siteUrl}/assets/mechanic-hero.jpg`;
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    '@id': `${siteUrl}/#business`,
    name: 'Lawson Mobile Mechanic',
    url: canonicalUrl,
    image: imageUrl,
    telephone: '(901) 555-0123',
    email: 'service@lawsonmobilemechanic.com',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Memphis',
      addressRegion: 'TN',
      addressCountry: 'US'
    },
    areaServed: publicAreaServed,
    makesOffer: publicServiceSchema.map((name) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name
      }
    }))
  };
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Lawson Mobile Mechanic',
      url: siteUrl
    },
    about: {
      '@id': `${siteUrl}/#business`
    }
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do you come to my location?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Lawson Mobile Mechanic provides on-site auto service at homes, workplaces, hotels, apartments, and parking lots around Memphis.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can I book online?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Customers can choose a service, pick an available time, pay the booking visit fee securely, and receive confirmation by phone or text.'
        }
      },
      {
        '@type': 'Question',
        name: 'Which services are available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Common mobile services include diagnostics, brakes, battery and charging checks, oil changes, and roadside mechanic help.'
        }
      }
    ]
  };

  return [localBusiness, webPage, faq];
};

const injectSeoIntoHtml = (html, route, nonce = '') => {
  const page = seoPages[route] || seoPages['/'];
  const canonicalUrl = `${siteUrl}${route === '/' ? '' : route}`;
  const imageUrl = `${siteUrl}/assets/mechanic-hero.jpg`;
  const nonceAttribute = nonce ? ` nonce="${escapeHtml(nonce)}"` : '';
  const structuredData = buildStructuredData(route, page)
    .map((schema, index) => `<script type="application/ld+json" data-schema="server-${index}"${nonceAttribute}>${JSON.stringify(schema)}</script>`)
    .join('\n    ');
  const seoHead = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(page.keywords)}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    '<meta property="og:site_name" content="Lawson Mobile Mechanic" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    structuredData
  ].join('\n    ');

  return html
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta name="description"[^>]*>\s*/gi, '')
    .replace(/<meta name="robots"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:[^"]+"[^>]*>\s*/gi, '')
    .replace('</head>', `    ${seoHead}\n  </head>`);
};

const sendPublicSeoPage = (req, res) => {
  const route = publicSeoPaths.includes(req.path) ? req.path : '/';
  const indexPath = path.join(frontendDistDir, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(injectSeoIntoHtml(html, route, res.locals.cspNonce));
};

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    `Disallow: ${admin.entryPath}`,
    'Disallow: /admin-login',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n'));
});

app.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const urls = publicSeoPaths.map((route) => {
    const loc = `${siteUrl}${route === '/' ? '' : route}`;
    const page = seoPages[route] || seoPages['/'];

    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      '  </url>'
    ].join('\n');
  });

  res.type('application/xml');
  res.send([
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>'
  ].join('\n'));
});

app.get('/available', async (req, res) => {
  try {
    const date = validateAppointmentDate(req.query.date);
    const rows = await all(
      "SELECT time FROM appointments WHERE date = ? AND status != 'canceled'",
      [date]
    );

    const bookedTimes = rows.map((row) => row.time);
    const availableTimes = allTimes.filter((time) => !bookedTimes.includes(time));
    res.json({ availableTimes });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Lawson booking database error') });
  }
});

app.post('/book', requireSameOrigin, checkBookingRateLimit, async (req, res) => {
  try {
    await verifyTurnstileToken({
      token: req.body?.turnstileToken,
      ip: req.ip
    });
    const result = await createBooking(req.body);
    logger.info('Booking created', {
      appointmentId: result.appointmentId,
      date: req.body?.date,
      time: req.body?.time,
      contactHash: contactEmailHash(req.body?.email),
      paymentStatus: result.paymentStatus
    });
    res.json(result);
  } catch (error) {
    logger.warn('Booking request failed', {
      date: req.body?.date,
      time: req.body?.time,
      contactHash: contactEmailHash(req.body?.email),
      message: error.message,
      statusCode: error.statusCode || 500
    });
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : mapDatabaseError(error, 'Error saving the Lawson booking request')
    });
  }
});

app.post('/client-log', requireSameOrigin, checkClientLogRateLimit, (req, res) => {
  const level = req.body?.level === 'error' ? 'error' : req.body?.level === 'warn' ? 'warn' : 'info';
  const source = normalizeText(req.body?.source || 'client');
  const event = normalizeText(req.body?.event || 'frontend-event');
  const message = normalizeText(req.body?.message || '');
  const pathName = normalizeText(req.body?.path || req.get('referer') || '');

  const safeMeta = {
    source,
    event,
    path: pathName,
    detail: normalizeText(req.body?.detail || ''),
    status: typeof req.body?.status === 'number' ? req.body.status : undefined
  };

  if (level === 'error') {
    logger.error(`Client log: ${event}${message ? ` - ${message}` : ''}`, safeMeta);
  } else if (level === 'warn') {
    logger.warn(`Client log: ${event}${message ? ` - ${message}` : ''}`, safeMeta);
  } else {
    logger.info(`Client log: ${event}${message ? ` - ${message}` : ''}`, safeMeta);
  }

  res.json({ accepted: true });
});

app.get('/admin/auth/options', (req, res) => {
  res.json({
    googleEnabled: canUseGoogleLogin(),
    googleClientId: admin.googleClientId || ''
  });
});

app.get('/admin/session', (req, res) => {
  const user = getCurrentAdminUser(req);

  res.json({
    authenticated: Boolean(user),
    user: user || null,
    auth: {
      googleEnabled: canUseGoogleLogin(),
      googleClientId: admin.googleClientId || ''
    }
  });
});

app.post('/admin/login', requireSameOrigin, checkLoginRateLimit, async (req, res) => {
  try {
    const identifier = validateAdminIdentifier(req.body.username || req.body.identifier);
    const password = validateLoginPassword(req.body.password);
    const user = await authenticateAdminUser(identifier, password);

    if (!user) {
      recordFailedLoginAttempt(req);
      return res.status(401).json({ error: 'Invalid Lawson admin credentials' });
    }

    clearLoginAttempts(req);
    await recordAdminLogin(user.id);
    const sessionUser = buildSessionUser(user);
    const token = createAdminSession(sessionUser);
    setSessionCookie(req, res, token);
    res.json({ message: `Welcome back, ${user.displayName}.`, user: sessionUser });
  } catch (error) {
    res.status(500).json({ error: 'Could not sign in.' });
  }
});

app.post('/admin/login/google', requireSameOrigin, checkLoginRateLimit, async (req, res) => {
  try {
    const googleIdentity = await verifyGoogleCredential(req.body.credential);
    const user = await authenticateGoogleAdminUser(googleIdentity.email, googleIdentity.googleSubject);

    if (!user) {
      recordFailedLoginAttempt(req);
      return res.status(403).json({ error: 'This Google account is not authorized for the admin panel.' });
    }

    clearLoginAttempts(req);
    await recordAdminLogin(user.id);
    const sessionUser = buildSessionUser(user);
    const token = createAdminSession(sessionUser);
    setSessionCookie(req, res, token);
    res.json({ message: `Signed in with Google as ${user.displayName}.`, user: sessionUser });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Could not sign in with Google.' });
  }
});

app.post('/admin/logout', requireSameOrigin, (req, res) => {
  const token = getValidSessionToken(req);

  if (token) {
    deleteSession(token);
  }

  clearSessionCookie(res);
  res.json({ message: 'Logged out of Lawson admin successfully' });
});

app.get('/admin/appointments', requireAdminAuth, requirePermission('appointments.read'), async (req, res) => {
  try {
    const appointments = await all(
      `SELECT id, name, phone, email, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents,
              square_payment_id, square_order_id, square_receipt_url, booking_source
       FROM appointments
       ORDER BY id ASC`
    );
    res.json({ appointments: decryptAppointmentRows(appointments) });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error loading Lawson service requests') });
  }
});

app.get('/admin/appointments/history', requireAdminAuth, requirePermission('history.read'), async (req, res) => {
  try {
    const history = await all(
      `SELECT id, appointment_id, name, phone, email, vehicle_details, service_requested, date, time, status, payment_status,
              payment_amount_cents, square_payment_id, square_order_id, action, recorded_at
       FROM appointment_history
       ORDER BY id ASC
       LIMIT 100`
    );
    res.json({ history: decryptAppointmentRows(history) });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error loading Lawson request history') });
  }
});

app.get('/admin/analytics', requireAdminAuth, requirePermission('analytics.read'), async (req, res) => {
  try {
    const analytics = await getAdminAnalytics();
    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not load admin analytics.') });
  }
});

app.get('/admin/users', requireAdminAuth, requirePermission('users.read'), async (req, res) => {
  try {
    const users = await listAdminUsers();
    res.json({
      users: users.map((user) => ({ ...user, roleLabel: roleLabels[user.role] })),
      roles: validRoles.map((role) => ({ value: role, label: roleLabels[role] }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not load the admin team.' });
  }
});

app.post('/admin/users', requireSameOrigin, requireAdminAuth, requirePermission('users.write'), async (req, res) => {
  try {
    const validatedProfile = validateAdminProfileInput({
      username: req.body.username,
      email: req.body.email,
      displayName: req.body.displayName,
      password: req.body.password,
      role: req.body.role,
      requirePassword: req.body.authProvider !== 'google'
    });
    const { username, email, displayName, role } = validatedProfile;
    const password = req.body.password ? validatePassword(req.body.password) : '';
    const authProvider = req.body.authProvider === 'google' || req.body.authProvider === 'hybrid' ? req.body.authProvider : 'password';

    const user = await createAdminUser({ username, email, displayName, password, role, authProvider });
    res.status(201).json({ message: `${displayName} joined the admin team.`, user });
  } catch (error) {
    res.status(400).json({ error: mapDatabaseError(error, error.message || 'Could not create the admin user.') });
  }
});

app.patch('/admin/users/:id', requireSameOrigin, requireAdminAuth, requirePermission('users.write'), async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const role = req.body.role ? normalizeRole(req.body.role) : null;
    const authProvider = req.body.authProvider === 'google' || req.body.authProvider === 'hybrid'
      ? req.body.authProvider
      : req.body.authProvider === 'password'
        ? 'password'
        : undefined;

    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (req.body.role && !role) {
      return res.status(400).json({ error: 'Select a valid admin role.' });
    }

    if (req.adminUser.id === userId && req.body.isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account while using it.' });
    }

    if (req.body.displayName) {
      validateAdminProfileInput({
        username: req.adminUser.username,
        email: req.adminUser.email,
        displayName: req.body.displayName,
        password: req.body.password || '',
        role: req.body.role || req.adminUser.role,
        requirePassword: false
      });
    }

    if (req.body.password) {
      validatePassword(req.body.password);
    }

    const updatedUser = await updateAdminUser(userId, {
      displayName: req.body.displayName ? normalizeText(req.body.displayName) : undefined,
      role: req.body.role ? role : undefined,
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
      password: req.body.password ? normalizeText(req.body.password) : undefined,
      authProvider
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'Admin user not found.' });
    }

    res.json({ message: `${updatedUser.displayName} was updated.`, user: updatedUser });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Could not update the admin user.' });
  }
});

app.post('/admin/appointments/history/:id/restore', requireSameOrigin, requireAdminAuth, requirePermission('appointments.write'), async (req, res) => {
  try {
    const historyItem = await get(
      `SELECT id, appointment_id, name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status,
              payment_amount_cents, square_payment_id, square_order_id
       FROM appointment_history
       WHERE id = ?`,
      [req.params.id]
    );

    if (!historyItem) {
      return res.status(404).json({ error: 'History item not found' });
    }

    const existingAppointment = await getAppointmentBySlot(historyItem.date, historyItem.time);

    if (existingAppointment) {
      return res.status(400).json({ error: 'Cannot restore this request because that time slot is already occupied.' });
    }

    await run('BEGIN TRANSACTION');

    try {
      const restoredStatus = 'pending';
      const decryptedHistoryItem = decryptAppointmentRow(historyItem);
      const secureFields = encryptAppointmentFields({
        name: decryptedHistoryItem.name,
        phone: decryptedHistoryItem.phone,
        email: decryptedHistoryItem.email,
        vehicle: decryptedHistoryItem.vehicle_details || ''
      });

      await run(
        `INSERT INTO appointments
         (name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, square_receipt_url, booking_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          secureFields.name,
          secureFields.phone,
          secureFields.email,
          secureFields.contact_email_hash,
          secureFields.contact_phone_hash,
          secureFields.vehicle_details,
          historyItem.service_requested || '',
          historyItem.date,
          historyItem.time,
          restoredStatus,
          historyItem.payment_status || 'not_required',
          historyItem.payment_amount_cents || 0,
          historyItem.square_payment_id || null,
          historyItem.square_order_id || null,
          null,
          'restored'
        ]
      );

      await run(
        `INSERT INTO appointment_history
         (appointment_id, name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, action, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyItem.appointment_id,
          secureFields.name,
          secureFields.phone,
          secureFields.email,
          secureFields.contact_email_hash,
          secureFields.contact_phone_hash,
          secureFields.vehicle_details,
          historyItem.service_requested || '',
          historyItem.date,
          historyItem.time,
          restoredStatus,
          historyItem.payment_status || 'not_required',
          historyItem.payment_amount_cents || 0,
          historyItem.square_payment_id || null,
          historyItem.square_order_id || null,
          'restored',
          new Date().toISOString()
        ]
      );

      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

    const decryptedHistoryItem = decryptAppointmentRow(historyItem);
    res.json({ message: `Restored ${decryptedHistoryItem.name}'s appointment for ${historyItem.date} at ${historyItem.time}.` });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not restore the archived appointment') });
  }
});

app.post('/admin/appointments/clear', requireSameOrigin, requireAdminAuth, requirePermission('appointments.write'), async (req, res) => {
  try {
    const appointments = await all(
      `SELECT id, name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents,
              square_payment_id, square_order_id
       FROM appointments
       ORDER BY id ASC`
    );

    if (!appointments.length) {
      return res.json({ message: 'No Lawson requests to clear.' });
    }

    await run('BEGIN TRANSACTION');

    try {
      const recordedAt = new Date().toISOString();

      for (const appointment of appointments) {
        await run(
          `INSERT INTO appointment_history
           (appointment_id, name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, action, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            appointment.id,
            appointment.name,
            appointment.phone,
            appointment.email,
            appointment.contact_email_hash || '',
            appointment.contact_phone_hash || '',
            appointment.vehicle_details || '',
            appointment.service_requested || '',
            appointment.date,
            appointment.time,
            appointment.status,
            appointment.payment_status,
            appointment.payment_amount_cents,
            appointment.square_payment_id,
            appointment.square_order_id,
            'cleared',
            recordedAt
          ]
        );
      }

      await run('DELETE FROM appointments');
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

    res.json({ message: `Cleared ${appointments.length} Lawson request(s) and saved them to history.` });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error clearing Lawson requests') });
  }
});

app.patch('/admin/appointments/:id/status', requireSameOrigin, requireAdminAuth, requirePermission('appointments.write'), async (req, res) => {
  try {
    if (!appointmentStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid Lawson request status' });
    }

    const existingAppointment = await get(
      `SELECT id, name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents,
              square_payment_id, square_order_id
       FROM appointments
       WHERE id = ?`,
      [req.params.id]
    );

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Lawson request not found' });
    }

    await run('BEGIN TRANSACTION');

    try {
      const result = await run('UPDATE appointments SET status = ? WHERE id = ?', [req.body.status, req.params.id]);

      if (result.changes === 0) {
        await run('ROLLBACK');
        return res.status(404).json({ error: 'Lawson request not found' });
      }

      if (req.body.status === 'canceled' && existingAppointment.status !== 'canceled') {
        await run(
          `INSERT INTO appointment_history
           (appointment_id, name, phone, email, contact_email_hash, contact_phone_hash, vehicle_details, service_requested, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, action, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            existingAppointment.id,
            existingAppointment.name,
            existingAppointment.phone,
            existingAppointment.email,
            existingAppointment.contact_email_hash || '',
            existingAppointment.contact_phone_hash || '',
            existingAppointment.vehicle_details || '',
            existingAppointment.service_requested || '',
            existingAppointment.date,
            existingAppointment.time,
            'canceled',
            existingAppointment.payment_status || 'not_required',
            existingAppointment.payment_amount_cents || 0,
            existingAppointment.square_payment_id || null,
            existingAppointment.square_order_id || null,
            'canceled',
            new Date().toISOString()
          ]
        );
      }

      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

    res.json({ message: `Lawson request marked as ${req.body.status}.` });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error updating Lawson request status') });
  }
});

app.delete('/admin/appointments/:id', requireSameOrigin, requireAdminAuth, requirePermission('appointments.write'), async (req, res) => {
  try {
    const result = await run('DELETE FROM appointments WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Lawson request not found' });
    }

    res.json({ message: 'Lawson request deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error deleting Lawson request') });
  }
});

app.get('/admin/pricing', requireAdminAuth, requirePermission('pricing.read'), async (req, res) => {
  try {
    const pricing = await getAllPricing();
    res.json({ pricing });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not load pricing configuration') });
  }
});

app.put('/admin/pricing', requireSameOrigin, requireAdminAuth, requirePermission('pricing.write'), async (req, res) => {
  try {
    const pricing = await updatePricing(req.body.items);
    const bookingFee = pricing.find((item) => item.isBookingFee);

    res.json({
      message: `Pricing updated successfully. Booking fee is now ${bookingFee ? bookingFee.priceFormatted : formatMoney(0)}.`,
      pricing
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Could not update pricing configuration' });
  }
});

app.get([admin.entryPath, `${admin.entryPath}/`], (req, res) => {
  const user = getCurrentAdminUser(req);

  if (user) {
    return res.redirect('/admin');
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(publicDir, 'admin-login.html'));
});

app.get('/admin.html', (req, res) => {
  return res.redirect('/admin');
});

app.get(['/admin.js', '/js/admin-main.js', '/js/admin-dom.js'], (req, res) => {
  return res.status(404).send('Not found');
});

app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
  const user = getCurrentAdminUser(req);

  if (!user) {
    const next = encodeURIComponent(req.originalUrl || '/admin');
    return res.redirect(302, `${admin.entryPath}?next=${next}`);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(frontendDistDir, 'index.html'));
});

app.get(['/admin-login', '/admin-login.html'], (req, res) => {
  res.redirect('/');
});

app.get(publicSeoPaths.filter((route) => route !== '/'), (req, res) => {
  sendPublicSeoPage(req, res);
});

app.get('/', (req, res) => {
  sendPublicSeoPage(req, res);
});

app.use(express.static(publicDir, { index: false, dotfiles: 'deny' }));
app.use(express.static(frontendDistDir, { dotfiles: 'deny' }));

const startServer = async () => {
  try {
    assertProductionConfig();
    await ensureSchema();

    app.listen(port, () => {
      logger.info('Server started', {
        port,
        url: `http://localhost:${port}`,
        paymentMode
      });
      logger.info('Routes ready', {
        bookingUrl: `http://localhost:${port}/`,
        adminLoginUrl: `http://localhost:${port}${admin.entryPath}`
      });
      logger.info('Live backend logs', {
        logFile: logger.backendLogPath
      });

      if (!paymentEnabled) {
        logger.warn('Square payment mode selected but not fully configured', {
          action: 'Set valid SQUARE_ACCESS_TOKEN, SQUARE_APP_ID, and SQUARE_LOCATION_ID in .env'
        });
      }

      if (!admin.googleClientId) {
        logger.warn('Google admin login is disabled', {
          action: 'Set GOOGLE_CLIENT_ID in .env and restart the server to enable Google sign-in.'
        });
      }
    });
  } catch (error) {
    logger.error('Failed to initialize database schema', {
      message: error.message
    });
    process.exit(1);
  }
};

module.exports = {
  app,
  startServer
};
