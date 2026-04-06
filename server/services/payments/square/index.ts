import crypto from 'node:crypto';
import { SquareClient, SquareError } from 'square';

import { square } from '../../../config/appConfig';
import type { AppError, PaymentInput, PaymentRecord } from '../../../types';

const hasRealCredential = (value: string): boolean => Boolean(value) && !String(value).startsWith('REPLACE_WITH_');

const enabled = hasRealCredential(square.accessToken)
  && hasRealCredential(square.appId)
  && hasRealCredential(square.locationId);

const squareClient = enabled
  ? new SquareClient({
      token: square.accessToken
    })
  : null;

const mapSquareError = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof SquareError) {
    const squareBody = error.body as { errors?: Array<{ detail?: string }> } | undefined;
    const squareErrors = Array.isArray(squareBody?.errors) ? squareBody.errors : [];
    const firstError = squareErrors[0];

    if (firstError?.detail) {
      return firstError.detail;
    }
  }

  return fallbackMessage;
};

const createPayment = async ({ sourceId, amountCents, referenceId, note }: PaymentInput): Promise<PaymentRecord> => {
  if (!enabled || !squareClient) {
    const error = new Error('Square is not configured yet. Add your Square credentials before accepting paid bookings.') as AppError;
    error.statusCode = 503;
    throw error;
  }

  if (!sourceId) {
    const error = new Error('Square payment token is required.') as AppError;
    error.statusCode = 400;
    throw error;
  }

  try {
    const response = await squareClient.payments.create({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: square.currency as any
      },
      autocomplete: true,
      locationId: square.locationId,
      referenceId,
      note
    });

    return response.payment || null;
  } catch (error) {
    const wrappedError = new Error(
      mapSquareError(error, 'Square could not process the payment. Please verify the card details and try again.')
    ) as AppError;
    wrappedError.statusCode = 400;
    throw wrappedError;
  }
};

export { createPayment, enabled };
export const providerLabel = 'Square';
