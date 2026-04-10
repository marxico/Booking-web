import type { BookingFormData, MockCardFormData } from "../types/booking";

const parseJsonResponse = async (response: Response, fallbackMessage: string) => {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || fallbackMessage);
  }

  return result;
};

export const loadBookingSetup = async () => {
  const [pricingResponse, squareResponse] = await Promise.all([
    fetch("/pricing"),
    fetch("/square/config")
  ]);

  const pricingResult = await parseJsonResponse(pricingResponse, "Could not load pricing.");
  const squareResult = await parseJsonResponse(squareResponse, "Could not load Square payment settings.");

  return {
    pricing: pricingResult.pricing || [],
    squareConfig: squareResult
  };
};

export const loadAvailableTimes = async (date: string) => {
  const response = await fetch(`/available?date=${encodeURIComponent(date)}`);
  const result = await parseJsonResponse(response, "Could not load available times.");

  return result.availableTimes || [];
};

export const submitBooking = async ({
  formData,
  sourceId,
  mockCard
}: {
  formData: BookingFormData;
  sourceId?: string;
  mockCard?: MockCardFormData;
}) => {
  const response = await fetch("/book", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...formData,
      sourceId,
      mockCard
    })
  });

  return parseJsonResponse(response, "Could not create appointment.");
};
