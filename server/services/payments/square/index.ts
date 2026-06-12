import crypto from 'node:crypto';

import { square } from '../../../config/appConfig';
import logger from '../../../utils/logger';
import type { AppError, PaymentInput, PaymentRecord } from '../../../types';

const hasRealCredential = (value: string): boolean => Boolean(value) && !String(value).startsWith('REPLACE_WITH_');

const enabled = hasRealCredential(square.accessToken)
  && hasRealCredential(square.appId)
  && hasRealCredential(square.locationId);

const squareApiBaseUrl = square.environment === 'sandbox'
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

const getSquareErrorMessage = (body: unknown, fallbackMessage: string): string => {
  if (!body || typeof body !== 'object') {
    return fallbackMessage;
  }

  const errors = (body as { errors?: Array<{ detail?: string }> }).errors;
  const firstError = Array.isArray(errors) ? errors[0] : null;

  return firstError?.detail || fallbackMessage;
};

const createPayment = async ({ sourceId, amountCents, referenceId, note }: PaymentInput): Promise<PaymentRecord> => {
  if (!enabled) {
    const error = new Error('Square is not configured yet. Add your Square credentials before accepting paid bookings.') as AppError;
    error.statusCode = 503;
    throw error;
  }

  if (!sourceId) {
    const error = new Error('Square payment token is required.') as AppError;
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    source_id: sourceId,
    idempotency_key: crypto.randomUUID(),
    amount_money: {
      amount: amountCents,
      currency: square.currency
    },
    autocomplete: true,
    location_id: square.locationId,
    reference_id: referenceId,
    note
  };

  const response = await fetch(`${squareApiBaseUrl}/v2/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${square.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': square.apiVersion
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => null) as {
    payment?: {
      id?: string | null;
      order_id?: string | null;
      receipt_url?: string | null;
    };
  } | null;

  if (!response.ok) {
    const message = getSquareErrorMessage(result, 'Square could not process the payment. Please verify the card details and try again.');
    logger.error('Square payment failed', {
      referenceId,
      amountCents,
      status: response.status,
      message
    });
    const error = new Error(message) as AppError;
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  logger.info('Square payment approved', {
    referenceId,
    amountCents,
    locationId: square.locationId,
    paymentId: result?.payment?.id || ''
  });

  return result?.payment
    ? {
        id: result.payment.id || null,
        orderId: result.payment.order_id || null,
        receiptUrl: result.payment.receipt_url || null
      }
    : null;
};

export { createPayment, enabled };
export const providerLabel = 'Square';
