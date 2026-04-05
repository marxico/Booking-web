const crypto = require('crypto');
const { SquareClient, SquareError } = require('square');

const { square } = require('../../../config/appConfig');

const hasRealCredential = (value) => Boolean(value) && !String(value).startsWith('REPLACE_WITH_');

const enabled = hasRealCredential(square.accessToken)
  && hasRealCredential(square.appId)
  && hasRealCredential(square.locationId);

const squareClient = enabled
  ? new SquareClient({
      token: square.accessToken
    })
  : null;

const mapSquareError = (error, fallbackMessage) => {
  if (error instanceof SquareError) {
    const squareErrors = Array.isArray(error.body?.errors) ? error.body.errors : [];
    const firstError = squareErrors[0];

    if (firstError?.detail) {
      return firstError.detail;
    }
  }

  return fallbackMessage;
};

const createPayment = async ({ sourceId, amountCents, referenceId, note }) => {
  if (!enabled) {
    const error = new Error('Square is not configured yet. Add your Square credentials before accepting paid bookings.');
    error.statusCode = 503;
    throw error;
  }

  if (!sourceId) {
    const error = new Error('Square payment token is required.');
    error.statusCode = 400;
    throw error;
  }

  try {
    const response = await squareClient.payments.create({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: square.currency
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
    );
    wrappedError.statusCode = 400;
    throw wrappedError;
  }
};

module.exports = {
  enabled,
  providerLabel: 'Square',
  createPayment
};
