const { square } = require('../config/appConfig');
const { all, get, run } = require('../db');

const formatMoney = (amountCents) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: square.currency
}).format(Number(amountCents || 0) / 100);

const mapRow = (row) => ({
  code: row.code,
  name: row.name,
  description: row.description,
  priceCents: row.price_cents,
  priceFormatted: formatMoney(row.price_cents),
  sortOrder: row.sort_order,
  isBookingFee: Boolean(row.is_booking_fee),
  isActive: Boolean(row.is_active),
  updatedAt: row.updated_at
});

const getAllPricing = async () => {
  const rows = await all(
    `SELECT code, name, description, price_cents, sort_order, is_booking_fee, is_active, updated_at
     FROM service_pricing
     ORDER BY sort_order ASC, name ASC`
  );

  return rows.map(mapRow);
};

const getPublicPricing = async () => {
  const pricing = await getAllPricing();
  return pricing.filter((item) => item.isActive);
};

const getBookingFee = async () => {
  const row = await get(
    `SELECT code, name, description, price_cents, sort_order, is_booking_fee, is_active, updated_at
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
      isBookingFee: true,
      isActive: false
    };
  }

  return mapRow(row);
};

const normalizeItem = (item) => ({
  code: String(item.code || '').trim(),
  name: String(item.name || '').trim(),
  description: String(item.description || '').trim(),
  priceCents: Number.parseInt(item.priceCents, 10),
  sortOrder: Number.parseInt(item.sortOrder, 10),
  isBookingFee: item.isBookingFee ? 1 : 0,
  isActive: item.isActive ? 1 : 0
});

const updatePricing = async (items) => {
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

    if (item.isBookingFee && !item.isActive) {
      throw new Error(`The booking fee must remain visible on the public pricing section`);
    }
  });

  await run('BEGIN TRANSACTION');

  try {
    for (const item of normalizedItems) {
      await run(
        `UPDATE service_pricing
         SET name = ?, description = ?, price_cents = ?, sort_order = ?, is_booking_fee = ?, is_active = ?, updated_at = ?
         WHERE code = ?`,
        [
          item.name,
          item.description,
          item.priceCents,
          item.sortOrder,
          item.isBookingFee,
          item.isActive,
          new Date().toISOString(),
          item.code
        ]
      );
    }

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }

  return getAllPricing();
};

module.exports = {
  formatMoney,
  getAllPricing,
  getPublicPricing,
  getBookingFee,
  updatePricing
};
