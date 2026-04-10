require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const { port, publicDir, frontendDistDir, allTimes, appointmentStatuses, admin, square } = require('./config/appConfig');
const { all, get, run, ensureSchema } = require('./db');
const logger = require('./utils/logger');
const {
  createAdminSession,
  getValidSessionToken,
  setSessionCookie,
  clearSessionCookie,
  deleteSession
} = require('./services/adminSessions');
const { formatMoney, getAllPricing, getPublicPricing, getBookingFee, updatePricing } = require('./services/pricingService');
const {
  isMockMode,
  isSquareMode,
  paymentMode,
  paymentEnabled,
  paymentProviderLabel,
  mockCards,
  createPayment
} = require('./services/payments');

const app = express();
const loginAttempts = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' https://web.squarecdn.com https://sandbox.web.squarecdn.com",
      "connect-src 'self' https://connect.squareup.com https://connect.squareupsandbox.com",
      "frame-src https://web.squarecdn.com https://sandbox.web.squarecdn.com"
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

  return fallbackMessage;
};

const requireAdminAuth = (req, res, next) => {
  const token = getValidSessionToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

const getAppointmentBySlot = (date, time) => get(
  "SELECT * FROM appointments WHERE date = ? AND time = ? AND status != 'canceled'",
  [date, time]
);

const validateMockCard = (mockCard) => {
  if (!isMockMode) {
    return null;
  }

  if (!mockCard) {
    return 'Mock card details are required in test payment mode';
  }

  const cardholder = String(mockCard.cardholder || '').trim();
  const number = String(mockCard.number || '').replace(/\D/g, '');
  const expiry = String(mockCard.expiry || '').trim();
  const cvv = String(mockCard.cvv || '').replace(/\D/g, '');

  if (!cardholder) {
    return 'Cardholder name is required for the test card';
  }

  if (number.length < 12 || number.length > 19) {
    return 'Enter a valid test card number';
  }

  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return 'Enter the expiry date as MM/YY';
  }

  if (cvv.length < 3 || cvv.length > 4) {
    return 'Enter a valid test CVV';
  }

  return null;
};

const validateBookingPayload = ({ name, phone, email, date, time }) => {
  const normalized = {
    name: String(name || '').trim(),
    phone: String(phone || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    date: String(date || '').trim(),
    time: String(time || '').trim()
  };

  if (!normalized.name || !normalized.phone || !normalized.email || !normalized.date || !normalized.time) {
    return { error: 'All booking fields are required' };
  }

  if (normalized.name.length > 80 || normalized.phone.length > 30 || normalized.email.length > 120) {
    return { error: 'One or more booking fields are too long.' };
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized.email)) {
    return { error: 'Enter a valid email address.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.date)) {
    return { error: 'Enter a valid appointment date.' };
  }

  return { value: normalized };
};

const createBooking = async ({ name, phone, email, date, time, sourceId, mockCard }) => {
  const bookingFee = await getBookingFee();
  const validation = validateBookingPayload({ name, phone, email, date, time });

  if (validation.error) {
    const error = new Error(validation.error) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  ({ name, phone, email, date, time } = validation.value);

  if (!allTimes.includes(time)) {
    const error = new Error('Invalid appointment time') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  if (bookingFee.priceCents > 0 && paymentMode === 'square' && !sourceId) {
    const error = new Error('Payment is required before this appointment can be reserved') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const mockCardError = validateMockCard(mockCard);

  if (mockCardError) {
    const error = new Error(mockCardError) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const existingAppointment = await getAppointmentBySlot(date, time);

  if (existingAppointment) {
    const error = new Error('This Lawson service slot is no longer available') as Error & { statusCode?: number };
    error.statusCode = 400;
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
      mockCard,
      amountCents: bookingFee.priceCents,
      referenceId: `${date}-${time}`,
      note: `Lawson booking for ${name} on ${date} at ${time}`
    });

    paymentStatus = 'paid';
    paymentAmountCents = bookingFee.priceCents;
    squarePaymentId = payment?.id || null;
    squareOrderId = payment?.orderId || null;
    squareReceiptUrl = payment?.receiptUrl || null;
    bookingSource = paymentMode;
  }

  const result = await run(
    `INSERT INTO appointments
     (name, phone, email, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, square_receipt_url, booking_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      phone,
      email,
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
      ? `Thanks, ${name}. Your ${bookingFee.priceFormatted} booking payment was approved and your request for ${date} at ${time} is pending review.`
      : `Thanks, ${name}. Lawson Mobile Mechanic received your service request for ${date} at ${time}.`
  };
};

app.get('/pricing', async (req, res) => {
  try {
    const pricing = await getPublicPricing();
    res.json({ pricing });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not load pricing.') });
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
      mockCards
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not load Square payment settings.' });
  }
});

app.get('/available', async (req, res) => {
  try {
    const rows = await all(
      "SELECT time FROM appointments WHERE date = ? AND status != 'canceled'",
      [req.query.date]
    );

    const bookedTimes = rows.map((row) => row.time);
    const availableTimes = allTimes.filter((time) => !bookedTimes.includes(time));
    res.json({ availableTimes });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Lawson booking database error') });
  }
});

app.post('/book', requireSameOrigin, async (req, res) => {
  try {
    const result = await createBooking(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : mapDatabaseError(error, 'Error saving the Lawson booking request')
    });
  }
});

app.get('/admin/session', (req, res) => {
  const token = getValidSessionToken(req);
  res.json({ authenticated: Boolean(token) });
});

app.post('/admin/login', requireSameOrigin, checkLoginRateLimit, (req, res) => {
  const { username, password } = req.body;

  if (!safeEqual(username, admin.username) || !safeEqual(password, admin.password)) {
    recordFailedLoginAttempt(req);
    return res.status(401).json({ error: 'Invalid Lawson admin credentials' });
  }

  clearLoginAttempts(req);
  const token = createAdminSession();
  setSessionCookie(req, res, token);
  res.json({ message: 'Lawson admin login successful' });
});

app.post('/admin/logout', requireSameOrigin, (req, res) => {
  const token = getValidSessionToken(req);

  if (token) {
    deleteSession(token);
  }

  clearSessionCookie(res);
  res.json({ message: 'Logged out of Lawson admin successfully' });
});

app.get('/admin/appointments', requireAdminAuth, async (req, res) => {
  try {
    const appointments = await all(
      `SELECT id, name, phone, email, date, time, status, payment_status, payment_amount_cents,
              square_payment_id, square_order_id, square_receipt_url, booking_source
       FROM appointments
       ORDER BY id ASC`
    );

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error loading Lawson service requests') });
  }
});

app.get('/admin/appointments/history', requireAdminAuth, async (req, res) => {
  try {
    const history = await all(
      `SELECT id, appointment_id, name, phone, email, date, time, status, payment_status,
              payment_amount_cents, square_payment_id, square_order_id, action, recorded_at
       FROM appointment_history
       ORDER BY id ASC
       LIMIT 100`
    );

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error loading Lawson request history') });
  }
});

app.post('/admin/appointments/history/:id/restore', requireSameOrigin, requireAdminAuth, async (req, res) => {
  try {
    const historyItem = await get(
      `SELECT id, appointment_id, name, phone, email, date, time, status, payment_status,
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

      await run(
        `INSERT INTO appointments
         (name, phone, email, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, square_receipt_url, booking_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyItem.name,
          historyItem.phone,
          historyItem.email,
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
         (appointment_id, name, phone, email, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, action, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyItem.appointment_id,
          historyItem.name,
          historyItem.phone,
          historyItem.email,
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

    res.json({ message: `Restored ${historyItem.name}'s appointment for ${historyItem.date} at ${historyItem.time}.` });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not restore the archived appointment') });
  }
});

app.post('/admin/appointments/clear', requireSameOrigin, requireAdminAuth, async (req, res) => {
  try {
    const appointments = await all(
     `SELECT id, name, phone, email, date, time, status, payment_status, payment_amount_cents,
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
           (appointment_id, name, phone, email, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, action, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            appointment.id,
            appointment.name,
            appointment.phone,
            appointment.email,
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

app.patch('/admin/appointments/:id/status', requireSameOrigin, requireAdminAuth, async (req, res) => {
  try {
    if (!appointmentStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid Lawson request status' });
    }

    const existingAppointment = await get(
      `SELECT id, name, phone, email, date, time, status, payment_status, payment_amount_cents,
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
           (appointment_id, name, phone, email, date, time, status, payment_status, payment_amount_cents, square_payment_id, square_order_id, action, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            existingAppointment.id,
            existingAppointment.name,
            existingAppointment.phone,
            existingAppointment.email,
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

app.delete('/admin/appointments/:id', requireSameOrigin, requireAdminAuth, async (req, res) => {
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

app.get('/admin/pricing', requireAdminAuth, async (req, res) => {
  try {
    const pricing = await getAllPricing();
    res.json({ pricing });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Could not load pricing configuration') });
  }
});

app.put('/admin/pricing', requireSameOrigin, requireAdminAuth, async (req, res) => {
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
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, 'admin-login.html'));
});

app.get(['/admin', '/admin/', '/admin-login', '/admin-login.html'], (req, res) => {
  res.redirect('/');
});

app.get('/admin.html', (req, res) => {
  const token = getValidSessionToken(req);

  if (!token) {
    return res.redirect(`${admin.entryPath}?next=/admin.html`);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDistDir, 'index.html'));
});

app.use(express.static(publicDir, { index: false, dotfiles: 'deny' }));
app.use(express.static(frontendDistDir, { dotfiles: 'deny' }));

const startServer = async () => {
  try {
    await ensureSchema();

    app.listen(port, () => {
      logger.info('Server started', {
        port,
        url: `http://localhost:${port}`,
        paymentMode
      });
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
