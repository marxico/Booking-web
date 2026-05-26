export type PricingItem = {
  code: string;
  name: string;
  description: string;
  priceFormatted: string;
  originalPriceFormatted?: string;
  discountedPriceCents?: number;
  discountType?: "none" | "percent" | "fixed";
  discountValue?: number;
  discountLabel?: string;
  hasDiscount?: boolean;
  isBookingFee: boolean;
};

export type SquareConfig = {
  enabled: boolean;
  paymentMode: "square";
  paymentProviderLabel: string;
  environment: "sandbox" | "production" | string;
  appId: string;
  locationId: string;
  paymentRequired: boolean;
  serviceCallOutFeeName: string;
  serviceCallOutFeeFormatted: string;
  turnstileSiteKey?: string;
};

export type BookingFormData = {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  service: string;
  date: string;
  time: string;
  company: string;
};

export type BookingFieldName = keyof BookingFormData;

export type BookingFieldErrors = Partial<Record<BookingFieldName, string>>;

export type BookingMessage = {
  text: string;
  type: "success" | "error";
};
