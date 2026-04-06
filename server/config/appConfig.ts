import path from 'node:path';

import type { PricingSeedItem } from '../types';

const rootDir = path.resolve(__dirname, '..', '..');

export const publicDir = path.join(rootDir, 'public');
export const frontendDistDir = path.join(rootDir, 'frontend', 'dist');
export const dbPath = path.join(rootDir, 'appointments.db');
export const port = Number.parseInt(process.env.PORT || '3000', 10);
export const allTimes = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'] as const;
export const appointmentStatuses = ['pending', 'accepted', 'canceled'] as const;

export const admin = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'change-me-admin',
  sessionCookieName: 'admin_session',
  sessionDurationMs: 1000 * 60 * 60 * 8
};

export const square = {
  paymentProviderMode: (process.env.PAYMENT_PROVIDER_MODE || 'mock').toLowerCase(),
  environment: (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase(),
  accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
  appId: process.env.SQUARE_APP_ID || '',
  locationId: process.env.SQUARE_LOCATION_ID || '',
  currency: process.env.SQUARE_CURRENCY || 'USD'
};

export const defaultPricing: PricingSeedItem[] = [
  {
    code: 'diagnostic_visit',
    name: 'Mobile Diagnostic Visit',
    description: 'Required payment to lock in a booking request and dispatch an on-site diagnostic visit.',
    priceCents: 9000,
    sortOrder: 1,
    isBookingFee: 1,
    isActive: 1
  },
  {
    code: 'brake_service',
    name: 'Brake Service Inspection',
    description: 'Pricing starts here for brake inspection and recommended service planning.',
    priceCents: 12500,
    sortOrder: 2,
    isBookingFee: 0,
    isActive: 1
  },
  {
    code: 'battery_service',
    name: 'Battery & Charging Check',
    description: 'Mobile battery diagnosis, charging system review, and replacement planning.',
    priceCents: 11000,
    sortOrder: 3,
    isBookingFee: 0,
    isActive: 1
  },
  {
    code: 'roadside_assistance',
    name: 'Emergency Assistance',
    description: 'Fast roadside mechanical help for urgent issues that need an experienced mobile mechanic.',
    priceCents: 15000,
    sortOrder: 4,
    isBookingFee: 0,
    isActive: 1
  }
];

export { rootDir };
