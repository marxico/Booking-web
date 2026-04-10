export type PricingItem = {
  code: string;
  name: string;
  description: string;
  priceFormatted: string;
  isBookingFee: boolean;
};

export type MockCardPreset = {
  label: string;
  description: string;
  number: string;
  expiry: string;
  cvv: string;
  result: "approved" | "declined";
};

export type SquareConfig = {
  enabled: boolean;
  paymentMode: "mock" | "square" | string;
  paymentProviderLabel: string;
  environment: "sandbox" | "production" | string;
  appId: string;
  locationId: string;
  paymentRequired: boolean;
  serviceCallOutFeeName: string;
  serviceCallOutFeeFormatted: string;
  mockCards?: MockCardPreset[];
};

export type BookingFormData = {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
};

export type MockCardFormData = {
  cardholder: string;
  number: string;
  expiry: string;
  cvv: string;
};

export type BookingMessage = {
  text: string;
  type: "success" | "error";
};
