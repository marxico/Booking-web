import sqlite3 from 'sqlite3';

import { dbPath, defaultPricing } from '../config/appConfig';
import logger from '../utils/logger';

type QueryParam = string | number | null;
type QueryParams = QueryParam[];

interface RunResult {
  changes: number;
  lastID: number;
}

const sqlite = sqlite3.verbose();
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
       (code, name, description, price_cents, sort_order, is_booking_fee, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.code,
        item.name,
        item.description,
        item.priceCents,
        item.sortOrder,
        item.isBookingFee,
        item.isActive,
        new Date().toISOString()
      ]
    );
  }
};

const ensureSchema = async (): Promise<void> => {
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

  await run(`CREATE TABLE IF NOT EXISTS appointment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
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

  await run(`CREATE TABLE IF NOT EXISTS service_pricing (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
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

  if (!(await columnExists('service_pricing', 'is_booking_fee'))) {
    await run('ALTER TABLE service_pricing ADD COLUMN is_booking_fee INTEGER NOT NULL DEFAULT 0');
  }

  if (!(await columnExists('service_pricing', 'is_active'))) {
    await run('ALTER TABLE service_pricing ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  }

  if (!(await columnExists('service_pricing', 'updated_at'))) {
    await run(`ALTER TABLE service_pricing ADD COLUMN updated_at TEXT NOT NULL DEFAULT '${formatSchemaDefault(new Date().toISOString())}'`);
  }

  await seedDefaultPricing();
};

export { db, run, get, all, ensureSchema };
