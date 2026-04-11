import { square } from '../config/appConfig';
import { all, get, run } from '../db';
import type { PricingItem, PricingRow } from '../types';

interface PricingUpdateInput {
  code?: string;
  name?: string;
  description?: string;
  priceCents?: number | string;
  discountType?: 'none' | 'percent' | 'fixed' | string;
  discountValue?: number | string;
  discountLabel?: string;
  sortOrder?: number | string;
  isBookingFee?: boolean;
  isActive?: boolean;
}

interface NormalizedPricingUpdate {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  discountType: 'none' | 'percent' | 'fixed';
  discountValue: number;
  discountLabel: string;
  sortOrder: number;
  isBookingFee: number;
  isActive: number;
}

const formatMoney = (amountCents: number): string => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: square.currency
}).format(Number(amountCents || 0) / 100);

const normalizeDiscountedPrice = (priceCents: number, discountType: string, discountValue: number): number => {
  if (discountType === 'percent') {
    return Math.max(0, priceCents - Math.round((priceCents * discountValue) / 100));
  }

  if (discountType === 'fixed') {
    return Math.max(0, priceCents - discountValue);
  }

  return priceCents;
};

const mapRow = (row: PricingRow): PricingItem => {
  const discountType = row.discount_type || 'none';
  const discountValue = Number(row.discount_value || 0);
  const discountedPriceCents = normalizeDiscountedPrice(row.price_cents, discountType, discountValue);
  const hasDiscount = discountType !== 'none' && discountedPriceCents < row.price_cents;

  return {
    code: row.code,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    discountedPriceCents,
    priceFormatted: formatMoney(discountedPriceCents),
    originalPriceFormatted: hasDiscount ? formatMoney(row.price_cents) : formatMoney(discountedPriceCents),
    discountType,
    discountValue,
    discountLabel: row.discount_label || '',
    hasDiscount,
    sortOrder: row.sort_order,
    isBookingFee: Boolean(row.is_booking_fee),
    isActive: Boolean(row.is_active),
    updatedAt: row.updated_at
  };
};

const getAllPricing = async (): Promise<PricingItem[]> => {
  const rows = await all<PricingRow>(
    `SELECT code, name, description, price_cents, discount_type, discount_value, discount_label, sort_order, is_booking_fee, is_active, updated_at
     FROM service_pricing
     ORDER BY sort_order ASC, name ASC`
  );

  return rows.map(mapRow);
};

const getPublicPricing = async (): Promise<PricingItem[]> => {
  const pricing = await getAllPricing();
  return pricing.filter((item) => item.isActive);
};

const getPublicPricingVersion = async (): Promise<string> => {
  const row = await get<{ version?: string; item_count?: number }>(
    `SELECT MAX(updated_at) AS version, COUNT(*) AS item_count
     FROM service_pricing
     WHERE is_active = 1`
  );

  if (!row?.version) {
    return `empty:${Number(row?.item_count || 0)}`;
  }

  return `${row.version}:${Number(row?.item_count || 0)}`;
};

const getBookingFee = async (): Promise<PricingItem> => {
  const row = await get<PricingRow>(
    `SELECT code, name, description, price_cents, discount_type, discount_value, discount_label, sort_order, is_booking_fee, is_active, updated_at
     FROM service_pricing
     WHERE is_booking_fee = 1
     LIMIT 1`
  );

  if (!row) {
    return {
      code: 'booking_fee',
      name: 'Booking Fee',
      description: '',
      priceCents: 0,
      priceFormatted: formatMoney(0),
      originalPriceFormatted: formatMoney(0),
      discountedPriceCents: 0,
      discountType: 'none',
      discountValue: 0,
      discountLabel: '',
      hasDiscount: false,
      isBookingFee: true,
      isActive: false
    };
  }

  return mapRow(row);
};

const normalizeItem = (item: PricingUpdateInput): NormalizedPricingUpdate => ({
  code: String(item.code || '').trim(),
  name: String(item.name || '').trim(),
  description: String(item.description || '').trim(),
  priceCents: Number.parseInt(String(item.priceCents), 10),
  discountType: item.discountType === 'percent' || item.discountType === 'fixed' ? item.discountType : 'none',
  discountValue: Number.parseInt(String(item.discountValue ?? 0), 10),
  discountLabel: String(item.discountLabel || '').trim(),
  sortOrder: Number.parseInt(String(item.sortOrder), 10),
  isBookingFee: item.isBookingFee ? 1 : 0,
  isActive: item.isActive ? 1 : 0
});

const updatePricing = async (items: PricingUpdateInput[]): Promise<PricingItem[]> => {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('Pricing items are required');
  }

  const normalizedItems = items.map(normalizeItem);

  if (normalizedItems.filter((item) => item.isBookingFee).length !== 1) {
    throw new Error('Exactly one service must be marked as the booking fee');
  }

  normalizedItems.forEach((item) => {
    if (!item.code || !item.name) {
      throw new Error('Each pricing item requires a code and name');
    }

    if (Number.isNaN(item.priceCents) || item.priceCents < 0) {
      throw new Error(`Invalid price for ${item.name}`);
    }

    if (Number.isNaN(item.sortOrder)) {
      throw new Error(`Invalid sort order for ${item.name}`);
    }

    if (Number.isNaN(item.discountValue) || item.discountValue < 0) {
      throw new Error(`Invalid discount value for ${item.name}`);
    }

    if (item.discountType === 'percent' && item.discountValue > 100) {
      throw new Error(`Percent discount cannot exceed 100 for ${item.name}`);
    }

    if (item.discountType === 'fixed' && item.discountValue > item.priceCents) {
      throw new Error(`Fixed discount cannot be greater than the price for ${item.name}`);
    }

    if (item.isBookingFee && !item.isActive) {
      throw new Error('The booking fee must remain visible on the public pricing section');
    }
  });

  await run('BEGIN TRANSACTION');

    try {
      const codes = normalizedItems.map((item) => item.code);

      if (codes.length) {
        const placeholders = codes.map(() => '?').join(', ');
        await run(`DELETE FROM service_pricing WHERE code NOT IN (${placeholders})`, codes);
      }

      for (const item of normalizedItems) {
        await run(
          `INSERT INTO service_pricing
           (code, name, description, price_cents, discount_type, discount_value, discount_label, sort_order, is_booking_fee, is_active, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(code) DO UPDATE SET
             name = excluded.name,
             description = excluded.description,
             price_cents = excluded.price_cents,
             discount_type = excluded.discount_type,
             discount_value = excluded.discount_value,
             discount_label = excluded.discount_label,
             sort_order = excluded.sort_order,
             is_booking_fee = excluded.is_booking_fee,
             is_active = excluded.is_active,
             updated_at = excluded.updated_at`,
          [
            item.code,
            item.name,
            item.description,
            item.priceCents,
            item.discountType,
            item.discountValue,
            item.discountLabel,
            item.sortOrder,
            item.isBookingFee,
            item.isActive,
            new Date().toISOString()
          ]
        );
      }

      const bookingFee = normalizedItems.find((item) => item.isBookingFee);

      if (!bookingFee) {
        throw new Error('Exactly one service must be marked as the booking fee');
      }

      await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }

  return getAllPricing();
};

export {
  formatMoney,
  getAllPricing,
  getPublicPricing,
  getPublicPricingVersion,
  getBookingFee,
  updatePricing
};
