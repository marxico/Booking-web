import crypto from 'node:crypto';

import { square } from '../../../config/appConfig';
import type { MockCardScenario, PaymentInput, PaymentRecord } from '../../../types';

const mockCards: MockCardScenario[] = [
  {
    label: 'Approved Visa',
    number: '4111111111111111',
    expiry: '12/34',
    cvv: '123',
    result: 'approved',
    description: 'Approves the booking payment successfully.'
  },
  {
    label: 'Declined Card',
    number: '4000000000000002',
    expiry: '12/34',
    cvv: '123',
    result: 'declined',
    description: 'Simulates a declined payment so the booking is blocked.'
  },
  {
    label: 'Requires Review',
    number: '4000000000009995',
    expiry: '12/34',
    cvv: '123',
    result: 'review',
    description: 'Simulates a payment processor review hold.'
  }
];

const normalizeCardNumber = (value: string | undefined): string => String(value || '').replace(/\D/g, '');

const createPayment = async ({ amountCents, referenceId, note, mockCard }: PaymentInput): Promise<PaymentRecord> => {
  const normalizedNumber = normalizeCardNumber(mockCard?.number);
  const selectedCard = mockCards.find((card) => card.number === normalizedNumber) || mockCards[0];

  if (selectedCard.result === 'declined') {
    const error = new Error('Test payment declined. Use the approved test card number or switch to a different scenario.');
    Object.assign(error, { statusCode: 402 });
    throw error;
  }

  if (selectedCard.result === 'review') {
    const error = new Error('Test payment flagged for review. Try the approved mock card to complete the booking.');
    Object.assign(error, { statusCode: 402 });
    throw error;
  }

  return {
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
  } as PaymentRecord;
};

export { mockCards, createPayment };
export const enabled = true;
export const providerLabel = 'Test payment mode';
