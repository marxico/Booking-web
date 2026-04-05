const crypto = require('crypto');

const { square } = require('../../../config/appConfig');

const createPayment = async ({ amountCents, referenceId, note }) => ({
  id: `mock-payment-${crypto.randomUUID()}`,
  orderId: `mock-order-${crypto.randomUUID()}`,
  receiptUrl: '',
  sourceType: 'mock',
  referenceId,
  note,
  amountMoney: {
    amount: BigInt(amountCents),
    currency: square.currency
  }
});

module.exports = {
  enabled: true,
  providerLabel: 'Test payment mode',
  createPayment
};
