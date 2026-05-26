import path from 'node:path';

import type { AdminRole, AdminUserSeed, PricingSeedItem } from '../types';

const rootDir = path.resolve(__dirname, '..', '..');

export const publicDir = path.join(rootDir, 'public');
export const frontendDistDir = path.join(rootDir, 'frontend', 'dist');
export const dbPath = path.resolve(rootDir, process.env.DB_PATH || path.join('data', 'production.sqlite'));
export const port = Number.parseInt(process.env.PORT || '3000', 10);
export const siteUrl = String(process.env.SITE_URL || `http://localhost:${port}`).replace(/\/+$/, '');
export const allTimes = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'] as const;
export const appointmentStatuses = ['pending', 'accepted', 'canceled'] as const;

const normalizeRoutePath = (value: string | undefined, fallback: string): string => {
  const rawPath = (value || fallback).trim() || fallback;
  const withLeadingSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const withoutTrailingSlash = withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, '')
    : withLeadingSlash;

  return withoutTrailingSlash;
};

export const admin = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'change-me-admin',
  entryPath: normalizeRoutePath(process.env.ADMIN_ENTRY_PATH, '/lawson-portal'),
  sessionCookieName: 'admin_session',
  sessionDurationMs: 1000 * 60 * 60 * 8,
  googleClientId: process.env.GOOGLE_CLIENT_ID || ''
};

const normalizeRole = (value: string | undefined): AdminRole => {
  const role = String(value || '').trim().toLowerCase();

  if (role === 'super_admin' || role === 'manager' || role === 'analyst' || role === 'viewer') {
    return role;
  }

  return 'viewer';
};

const buildFallbackAdminUsers = (): AdminUserSeed[] => [
  {
    username: admin.username,
    email: process.env.ADMIN_EMAIL || 'admin@lawson.local',
    displayName: process.env.ADMIN_DISPLAY_NAME || 'Lawson Admin',
    password: admin.password,
    role: normalizeRole(process.env.ADMIN_ROLE || 'super_admin'),
    authProvider: admin.googleClientId ? 'hybrid' : 'password',
    isActive: 1
  }
];

const parseAdminUsersSeed = (): AdminUserSeed[] => {
  const raw = process.env.ADMIN_USERS_JSON;

  if (!raw) {
    return buildFallbackAdminUsers();
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed) || !parsed.length) {
      return buildFallbackAdminUsers();
    }

    return parsed
      .map((entry) => ({
        username: String(entry?.username || '').trim(),
        email: String(entry?.email || '').trim().toLowerCase(),
        displayName: String(entry?.displayName || entry?.display_name || '').trim(),
        password: String(entry?.password || ''),
        role: normalizeRole(entry?.role),
        authProvider: entry?.authProvider === 'google' || entry?.authProvider === 'hybrid' ? entry.authProvider : 'password',
        googleSubject: entry?.googleSubject ? String(entry.googleSubject) : undefined,
        isActive: entry?.isActive === 0 ? 0 : 1
      }))
      .filter((entry) => entry.username && entry.email && entry.displayName && entry.password);
  } catch (error) {
    return buildFallbackAdminUsers();
  }
};

export const defaultAdminUsers = parseAdminUsersSeed();

export const square = {
  environment: (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase(),
  accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
  appId: process.env.SQUARE_APP_ID || '',
  locationId: process.env.SQUARE_LOCATION_ID || '',
  currency: process.env.SQUARE_CURRENCY || 'USD'
};

export const turnstile = {
  siteKey: process.env.TURNSTILE_SITE_KEY || '',
  secretKey: process.env.TURNSTILE_SECRET_KEY || ''
};

export const defaultPricing: PricingSeedItem[] = [
  {
    code: 'diagnostic_visit',
    name: 'Mobile Diagnostic Visit',
    description: 'Required payment to lock in a booking request and dispatch an on-site diagnostic visit.',
    priceCents: 9000,
    discountType: 'none',
    discountValue: 0,
    discountLabel: '',
    sortOrder: 1,
    isBookingFee: 1,
    isActive: 1
  },
  {
    code: 'brake_service',
    name: 'Brake Service Inspection',
    description: 'Pricing starts here for brake inspection and recommended service planning.',
    priceCents: 12500,
    discountType: 'none',
    discountValue: 0,
    discountLabel: '',
    sortOrder: 2,
    isBookingFee: 0,
    isActive: 1
  },
  {
    code: 'battery_service',
    name: 'Battery & Charging Check',
    description: 'Mobile battery diagnosis, charging system review, and replacement planning.',
    priceCents: 11000,
    discountType: 'none',
    discountValue: 0,
    discountLabel: '',
    sortOrder: 3,
    isBookingFee: 0,
    isActive: 1
  },
  {
    code: 'roadside_assistance',
    name: 'Emergency Assistance',
    description: 'Fast roadside mechanical help for urgent issues that need an experienced mobile mechanic.',
    priceCents: 15000,
    discountType: 'none',
    discountValue: 0,
    discountLabel: '',
    sortOrder: 4,
    isBookingFee: 0,
    isActive: 1
  }
];

export { rootDir };
