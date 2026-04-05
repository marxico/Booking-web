const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;
const ALL_TIMES = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'];
const APPOINTMENT_STATUSES = ['pending', 'accepted', 'canceled'];
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-admin';
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;
const adminSessions = new Map();

app.use(express.json());
app.use(cors());

const mapDatabaseError = (error, fallbackMessage) => {
  if (!error) {
    return fallbackMessage;
  }

  if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
    return 'The Lawson scheduling database is locked. Save and close your SQLite editor, then try again.';
  }

  return fallbackMessage;
};

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex);
      const value = decodeURIComponent(entry.slice(separatorIndex + 1));
      cookies[key] = value;
      return cookies;
    }, {});
};

const createSessionToken = () => crypto.randomBytes(24).toString('hex');

const createAdminSession = () => {
  const token = createSessionToken();
  adminSessions.set(token, {
    expiresAt: Date.now() + SESSION_DURATION_MS
  });
  return token;
};

const clearExpiredSessions = () => {
  const now = Date.now();

  adminSessions.forEach((session, token) => {
    if (session.expiresAt <= now) {
      adminSessions.delete(token);
    }
  });
};

const getValidSessionToken = (req) => {
  clearExpiredSessions();
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) {
    return null;
  }

  const session = adminSessions.get(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(token);
    return null;
  }

  return token;
};

const setSessionCookie = (res, token) => {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}`
  );
};

const clearSessionCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
};

const requireAdminAuth = (req, res, next) => {
  const token = getValidSessionToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

const db = new sqlite3.Database('./appointments.db', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.configure('busyTimeout', 5000);

const runQuery = (query) => new Promise((resolve, reject) => {
  db.run(query, (err) => {
    if (err) {
      reject(err);
      return;
    }

    resolve();
  });
});

const allQuery = (query) => new Promise((resolve, reject) => {
  db.all(query, [], (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows);
  });
});

const runStatement = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve({
      changes: this.changes,
      lastID: this.lastID
    });
  });
});

const ensureAppointmentsSchema = async () => {
  try {
    await runQuery('PRAGMA journal_mode = WAL');
  } catch (err) {
    console.warn('Could not enable WAL mode:', err.message);
  }

  try {
    await runQuery('PRAGMA synchronous = NORMAL');
  } catch (err) {
    console.warn('Could not set synchronous mode:', err.message);
  }

  await runQuery(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL
  )`);

  const columns = await allQuery('PRAGMA table_info(appointments)');
  const hasStatusColumn = columns.some((column) => column.name === 'status');

  if (!hasStatusColumn) {
    await runQuery("ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  }

  await runQuery(`CREATE TABLE IF NOT EXISTS appointment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL,
    action TEXT NOT NULL,
    recorded_at TEXT NOT NULL
  )`);
};

const validateAppointmentPayload = ({ name, email, date, time }) => {
  if (!name || !email || !date || !time) {
    return 'All booking fields are required';
  }

  if (!ALL_TIMES.includes(time)) {
    return 'Invalid appointment time';
  }

  return null;
};

app.get('/admin/session', (req, res) => {
  const token = getValidSessionToken(req);
  res.json({ authenticated: Boolean(token) });
});

app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin-login', (req, res) => {
  res.redirect('/admin-login.html');
});

app.get('/admin.html', (req, res) => {
  const token = getValidSessionToken(req);

  if (!token) {
    return res.redirect('/admin-login.html?next=/admin.html');
  }

  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid Lawson admin credentials' });
  }

  const token = createAdminSession();
  setSessionCookie(res, token);
  res.json({ message: 'Lawson admin login successful' });
});

app.post('/admin/logout', (req, res) => {
  const token = getValidSessionToken(req);

  if (token) {
    adminSessions.delete(token);
  }

  clearSessionCookie(res);
  res.json({ message: 'Logged out of Lawson admin successfully' });
});

app.post('/book', (req, res) => {
  const { name, email, date, time } = req.body;
  const validationError = validateAppointmentPayload({ name, email, date, time });

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  db.get(
    "SELECT * FROM appointments WHERE date = ? AND time = ? AND status != 'canceled'",
    [date, time],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: mapDatabaseError(err, 'Lawson booking database error') });
      }

      if (row) {
        return res.status(400).json({ error: 'This Lawson service slot is no longer available' });
      }

      db.run(
        'INSERT INTO appointments (name, email, date, time, status) VALUES (?, ?, ?, ?, ?)',
        [name, email, date, time, 'pending'],
        function(insertError) {
          if (insertError) {
            return res.status(500).json({ error: mapDatabaseError(insertError, 'Error saving the Lawson booking request') });
          }

          res.json({
            message: `Thanks, ${name}. Lawson Mobile Mechanic received your service request for ${date} at ${time}.`
          });
        }
      );
    }
  );
});

app.get('/admin/appointments', requireAdminAuth, (req, res) => {
  db.all(
    'SELECT id, name, email, date, time, status FROM appointments ORDER BY date ASC, time ASC, id ASC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: mapDatabaseError(err, 'Error loading Lawson service requests') });
      }

      res.json({ appointments: rows });
    }
  );
});

app.get('/admin/appointments/history', requireAdminAuth, (req, res) => {
  db.all(
    `SELECT id, appointment_id, name, email, date, time, status, action, recorded_at
     FROM appointment_history
     ORDER BY recorded_at DESC, id DESC
     LIMIT 100`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: mapDatabaseError(err, 'Error loading Lawson request history') });
      }

      res.json({ history: rows });
    }
  );
});

app.post('/admin/appointments/clear', requireAdminAuth, async (req, res) => {
  try {
    const appointments = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name, email, date, time, status FROM appointments ORDER BY date ASC, time ASC, id ASC',
        [],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(rows);
        }
      );
    });

    if (!appointments.length) {
      return res.json({ message: 'No Lawson requests to clear.' });
    }

    await runQuery('BEGIN TRANSACTION');

    try {
      const recordedAt = new Date().toISOString();

      for (const appointment of appointments) {
        await runStatement(
          `INSERT INTO appointment_history
           (appointment_id, name, email, date, time, status, action, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            appointment.id,
            appointment.name,
            appointment.email,
            appointment.date,
            appointment.time,
            appointment.status,
            'cleared',
            recordedAt
          ]
        );
      }

      await runStatement('DELETE FROM appointments');
      await runQuery('COMMIT');
    } catch (transactionError) {
      await runQuery('ROLLBACK');
      throw transactionError;
    }

    res.json({ message: `Cleared ${appointments.length} Lawson request(s) and saved them to history.` });
  } catch (error) {
    res.status(500).json({ error: mapDatabaseError(error, 'Error clearing Lawson requests') });
  }
});

app.patch('/admin/appointments/:id/status', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!APPOINTMENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid Lawson request status' });
  }

  db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: mapDatabaseError(err, 'Error updating Lawson request status') });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Lawson request not found' });
    }

    res.json({ message: `Lawson request marked as ${status}.` });
  });
});

app.delete('/admin/appointments/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM appointments WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: mapDatabaseError(err, 'Error deleting Lawson request') });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Lawson request not found' });
    }

    res.json({ message: 'Lawson request deleted successfully.' });
  });
});

app.get('/available', (req, res) => {
  const { date } = req.query;

  db.all(
    "SELECT time FROM appointments WHERE date = ? AND status != 'canceled'",
    [date],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: mapDatabaseError(err, 'Lawson booking database error') });
      }

      const bookedTimes = rows.map((row) => row.time);
      const availableTimes = ALL_TIMES.filter((time) => !bookedTimes.includes(time));
      res.json({ availableTimes });
    }
  );
});

app.use(express.static('.'));

ensureAppointmentsSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database schema:', error.message);
    process.exit(1);
  });
