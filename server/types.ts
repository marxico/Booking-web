export interface PricingSeedItem {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  sortOrder: number;
  isBookingFee: number;
  isActive: number;
}

export interface PricingRow {
  code: string;
  name: string;
  description: string;
  price_cents: number;
  sort_order: number;
  is_booking_fee: number;
  is_active: number;
  updated_at: string;
}

export interface PricingItem {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  priceFormatted: string;
  sortOrder?: number;
  isBookingFee: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface MockCardInput {
  cardholder?: string;
  number?: string;
  expiry?: string;
  cvv?: string;
}

export interface MockCardScenario {
  label: string;
  number: string;
  expiry: string;
  cvv: string;
  result: 'approved' | 'declined' | 'review';
  description: string;
}

export interface PaymentRecord {
  id?: string | null;
  orderId?: string | null;
  receiptUrl?: string | null;
}

export interface PaymentInput {
  sourceId?: string;
  mockCard?: MockCardInput;
  amountCents: number;
  referenceId: string;
  note: string;
}

export interface BookingRequest {
  name?: string;
  phone?: string;
  email?: string;
  date?: string;
  time?: string;
  sourceId?: string;
  mockCard?: MockCardInput;
}

export interface AppointmentRow {
  id?: number;
  appointment_id?: number;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  status: string;
  payment_status?: string;
  payment_amount_cents?: number;
  square_payment_id?: string | null;
  square_order_id?: string | null;
  square_receipt_url?: string | null;
  booking_source?: string;
  action?: string;
  recorded_at?: string;
}

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}
