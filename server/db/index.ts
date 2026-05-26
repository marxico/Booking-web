import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { dbPath, defaultAdminUsers, defaultPricing } from '../config/appConfig';
import { hashPassword } from '../services/adminSecurity';
import {
  contactEmailHash,
  contactPhoneHash,
  decryptField,
  encryptField,
  isEncryptedField
} from '../services/secureFields';
import logger from '../utils/logger';

type QueryParam = string | number | null;
type QueryParams = QueryParam[];

interface RunResult {
  changes: number;
  lastID: number;
}

const sqlite = sqlite3.verbose();

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite.Database(dbPath, (error) => {
  if (error) {
    logger.error('Error connecting to the database', { message: error.message });
    return;
  }

  logger.info('Connected to the SQLite database');
});

db.configure('busyTimeout', 5000);

const run = (query: string, params: QueryParams = []): Promise<RunResult> => new Promise((resolve, reject) => {
  db.run(query, params, function onRun(error) {
    if (error) {
      reject(error);
      return;
    }

    resolve({
      changes: this.changes,
      lastID: this.lastID
    });
  });
});

const get = <TRow>(query: string, params: QueryParams = []): Promise<TRow | undefined> => new Promise((resolve, reject) => {
  db.get(query, params, (error, row) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(row as TRow | undefined);
  });
});

const all = <TRow>(query: string, params: QueryParams = []): Promise<TRow[]> => new Promise((resolve, reject) => {
  db.all(query, params, (error, rows) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(rows as TRow[]);
  });
});

const formatSchemaDefault = (value: string): string => String(value).replace(/'/g, "''");

const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  const columns = await all<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
};

const seedDefaultPricing = async (): Promise<void> => {
  for (const item of defaultPricing) {
    await run(
      `INSERT OR IGNORE INTO service_pricing
       (code, name, description, price_cents, discount_type, discount_value, discount_label, sort_order, is_booking_fee, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.code,
        item.name,
        item.description,
        item.priceCents,
        item.discountType || 'none',
        item.discountValue || 0,
        item.discountLabel || '',
        item.sortOrder,
        item.isBookingFee,
        item.isActive,
        new Date().toISOString()
      ]
    );
  }
};

const seedDefaultAdminUsers = async (): Promise<void> => {
  for (const user of defaultAdminUsers) {
    const existing = await get<{
      id: number;
      username: string;
      email: string;
      display_name: string;
      role: string;
      auth_provider: string;
      is_active: number;
    }>(
      `SELECT id, username, email, display_name, role, auth_provider, is_active
       FROM admin_users
       WHERE lower(email) = ? OR lower(username) = ?
       LIMIT 1`,
      [user.email.toLowerCase(), user.username.toLowerCase()]
    );

    if (existing) {
      const needsSync = existing.email !== user.email.toLowerCase()
        || existing.display_name !== user.displayName
        || existing.role !== user.role
        || existing.auth_provider !== user.authProvider
        || existing.is_active !== (user.isActive ?? 1);

      if (needsSync || user.authProvider !== 'google') {
        await run(
          `UPDATE admin_users
           SET email = ?, display_name = ?, role = ?, auth_provider = ?, password_hash = ?, is_active = ?, updated_at = ?
           WHERE id = ?`,
          [
            user.email.toLowerCase(),
            user.displayName,
            user.role,
            user.authProvider,
            user.authProvider === 'google' ? null : hashPassword(user.password),
            user.isActive ?? 1,
            new Date().toISOString(),
            existing.id
          ]
        );
      }

      continue;
    }

    const now = new Date().toISOString();

    await run(
      `INSERT INTO admin_users
       (username, email, display_name, password_hash, role, auth_provider, google_subject, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.username,
        user.email.toLowerCase(),
        user.displayName,
        user.authProvider === 'google' ? null : hashPassword(user.password),
        user.role,
        user.authProvider,
        user.googleSubject || null,
        user.isActive ?? 1,
        now,
        now
      ]
    );
  }
};

const migrateEncryptedAppointmentTable = async (tableName: 'appointments' | 'appointment_history'): Promise<void> => {
  const rows = await all<{
    id: number;
    name: string;
    phone: string;
    email: string;
    vehicle_details: string;
    contact_email_hash?: string;
    contact_phone_hash?: string;
  }>(
    `SELECT id, name, phone, email, vehicle_details, contact_email_hash, contact_phone_hash
     FROM ${tableName}`
  );

  for (const row of rows) {
    const name = decryptField(row.name);
    const phone = decryptField(row.phone);
    const email = decryptField(row.email);
    const vehicle = decryptField(row.vehicle_details);
    const needsEncryption = !isEncryptedField(row.name)
      || !isEncryptedField(row.phone)
      || !isEncryptedField(row.email)
      || !isEncryptedField(row.vehicle_details)
      || !row.contact_email_hash
      || !row.contact_phone_hash;

    if (!needsEncryption) {
      continue;
    }

    await run(
      `UPDATE ${tableName}
       SET name = ?, phone = ?, email = ?, vehicle_details = ?, contact_email_hash = ?, contact_phone_hash = ?
       WHERE id = ?`,
      [
        encryptField(name),
        encryptField(phone),
        encryptField(email),
        encryptField(vehicle),
        contactEmailHash(email),
        contactPhoneHash(phone),
        row.id
      ]
    );
  }
};

const ensureSchema = async (): Promise<void> => {
  try {
    await run('PRAGMA foreign_keys = ON');
  } catch (error) {
    logger.warn('Could not enable foreign key checks', { message: (error as Error).message });
  }

  try {
    await run('PRAGMA journal_mode = WAL');
  } catch (error) {
    logger.warn('Could not enable WAL mode', { message: (error as Error).message });
  }

  try {
    await run('PRAGMA synchronous = NORMAL');
  } catch (error) {
    logger.warn('Could not set synchronous mode', { message: (error as Error).message });
  }

  await run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    contact_email_hash TEXT NOT NULL DEFAULT '',
    contact_phone_hash TEXT NOT NULL DEFAULT '',
    vehicle_details TEXT NOT NULL DEFAULT '',
    service_requested TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'not_required',
    payment_amount_cents INTEGER NOT NULL DEFAULT 0,
    square_payment_id TEXT,
    square_order_id TEXT,
    square_receipt_url TEXT,
    booking_source TEXT NOT NULL DEFAULT 'manual'
  )`);

  if (!(await columnExists('appointments', 'phone'))) {
    await run("ALTER TABLE appointments ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointments', 'service_requested'))) {
    await run("ALTER TABLE appointments ADD COLUMN service_requested TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointments', 'vehicle_details'))) {
    await run("ALTER TABLE appointments ADD COLUMN vehicle_details TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointments', 'contact_email_hash'))) {
    await run("ALTER TABLE appointments ADD COLUMN contact_email_hash TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointments', 'contact_phone_hash'))) {
    await run("ALTER TABLE appointments ADD COLUMN contact_phone_hash TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointments', 'status'))) {
    await run("ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  }

  if (!(await columnExists('appointments', 'payment_status'))) {
    await run("ALTER TABLE appointments ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'not_required'");
  }

  if (!(await columnExists('appointments', 'payment_amount_cents'))) {
    await run('ALTER TABLE appointments ADD COLUMN payment_amount_cents INTEGER NOT NULL DEFAULT 0');
  }

  if (!(await columnExists('appointments', 'square_payment_id'))) {
    await run('ALTER TABLE appointments ADD COLUMN square_payment_id TEXT');
  }

  if (!(await columnExists('appointments', 'square_order_id'))) {
    await run('ALTER TABLE appointments ADD COLUMN square_order_id TEXT');
  }

  if (!(await columnExists('appointments', 'square_receipt_url'))) {
    await run('ALTER TABLE appointments ADD COLUMN square_receipt_url TEXT');
  }

  if (!(await columnExists('appointments', 'booking_source'))) {
    await run("ALTER TABLE appointments ADD COLUMN booking_source TEXT NOT NULL DEFAULT 'manual'");
  }

  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot
    ON appointments(date, time)
    WHERE status != 'canceled'`);

  await run('CREATE INDEX IF NOT EXISTS idx_appointments_contact_email_hash ON appointments(contact_email_hash)');
  await run('CREATE INDEX IF NOT EXISTS idx_appointments_contact_phone_hash ON appointments(contact_phone_hash)');
  await run('CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, date)');

  await run(`CREATE TABLE IF NOT EXISTS appointment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    contact_email_hash TEXT NOT NULL DEFAULT '',
    contact_phone_hash TEXT NOT NULL DEFAULT '',
    vehicle_details TEXT NOT NULL DEFAULT '',
    service_requested TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'not_required',
    payment_amount_cents INTEGER NOT NULL DEFAULT 0,
    square_payment_id TEXT,
    square_order_id TEXT,
    action TEXT NOT NULL,
    recorded_at TEXT NOT NULL
  )`);

  if (!(await columnExists('appointment_history', 'phone'))) {
    await run("ALTER TABLE appointment_history ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointment_history', 'service_requested'))) {
    await run("ALTER TABLE appointment_history ADD COLUMN service_requested TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointment_history', 'vehicle_details'))) {
    await run("ALTER TABLE appointment_history ADD COLUMN vehicle_details TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointment_history', 'contact_email_hash'))) {
    await run("ALTER TABLE appointment_history ADD COLUMN contact_email_hash TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointment_history', 'contact_phone_hash'))) {
    await run("ALTER TABLE appointment_history ADD COLUMN contact_phone_hash TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('appointment_history', 'payment_status'))) {
    await run("ALTER TABLE appointment_history ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'not_required'");
  }

  if (!(await columnExists('appointment_history', 'payment_amount_cents'))) {
    await run('ALTER TABLE appointment_history ADD COLUMN payment_amount_cents INTEGER NOT NULL DEFAULT 0');
  }

  if (!(await columnExists('appointment_history', 'square_payment_id'))) {
    await run('ALTER TABLE appointment_history ADD COLUMN square_payment_id TEXT');
  }

  if (!(await columnExists('appointment_history', 'square_order_id'))) {
    await run('ALTER TABLE appointment_history ADD COLUMN square_order_id TEXT');
  }

  await run('CREATE INDEX IF NOT EXISTS idx_appointment_history_recorded_at ON appointment_history(recorded_at)');

  await migrateEncryptedAppointmentTable('appointments');
  await migrateEncryptedAppointmentTable('appointment_history');

  await run(`CREATE TABLE IF NOT EXISTS service_pricing (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'none',
    discount_value INTEGER NOT NULL DEFAULT 0,
    discount_label TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_booking_fee INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`);

  if (!(await columnExists('service_pricing', 'description'))) {
    await run("ALTER TABLE service_pricing ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('service_pricing', 'sort_order'))) {
    await run('ALTER TABLE service_pricing ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  }

  if (!(await columnExists('service_pricing', 'discount_type'))) {
    await run("ALTER TABLE service_pricing ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'none'");
  }

  if (!(await columnExists('service_pricing', 'discount_value'))) {
    await run('ALTER TABLE service_pricing ADD COLUMN discount_value INTEGER NOT NULL DEFAULT 0');
  }

  if (!(await columnExists('service_pricing', 'discount_label'))) {
    await run("ALTER TABLE service_pricing ADD COLUMN discount_label TEXT NOT NULL DEFAULT ''");
  }

  if (!(await columnExists('service_pricing', 'is_booking_fee'))) {
    await run('ALTER TABLE service_pricing ADD COLUMN is_booking_fee INTEGER NOT NULL DEFAULT 0');
  }

  if (!(await columnExists('service_pricing', 'is_active'))) {
    await run('ALTER TABLE service_pricing ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  }

  if (!(await columnExists('service_pricing', 'updated_at'))) {
    await run(`ALTER TABLE service_pricing ADD COLUMN updated_at TEXT NOT NULL DEFAULT '${formatSchemaDefault(new Date().toISOString())}'`);
  }

  await run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    auth_provider TEXT NOT NULL DEFAULT 'password',
    google_subject TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  )`);

  if (!(await columnExists('admin_users', 'display_name'))) {
    await run("ALTER TABLE admin_users ADD COLUMN display_name TEXT NOT NULL DEFAULT 'Admin User'");
  }

  if (!(await columnExists('admin_users', 'password_hash'))) {
    await run('ALTER TABLE admin_users ADD COLUMN password_hash TEXT');
  }

  if (!(await columnExists('admin_users', 'role'))) {
    await run("ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'");
  }

  if (!(await columnExists('admin_users', 'auth_provider'))) {
    await run("ALTER TABLE admin_users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'password'");
  }

  if (!(await columnExists('admin_users', 'google_subject'))) {
    await run('ALTER TABLE admin_users ADD COLUMN google_subject TEXT');
  }

  if (!(await columnExists('admin_users', 'is_active'))) {
    await run('ALTER TABLE admin_users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  }

  if (!(await columnExists('admin_users', 'created_at'))) {
    await run(`ALTER TABLE admin_users ADD COLUMN created_at TEXT NOT NULL DEFAULT '${formatSchemaDefault(new Date().toISOString())}'`);
  }

  if (!(await columnExists('admin_users', 'updated_at'))) {
    await run(`ALTER TABLE admin_users ADD COLUMN updated_at TEXT NOT NULL DEFAULT '${formatSchemaDefault(new Date().toISOString())}'`);
  }

  if (!(await columnExists('admin_users', 'last_login_at'))) {
    await run('ALTER TABLE admin_users ADD COLUMN last_login_at TEXT');
  }

  await seedDefaultPricing();
  await seedDefaultAdminUsers();
};

export { db, run, get, all, ensureSchema };
