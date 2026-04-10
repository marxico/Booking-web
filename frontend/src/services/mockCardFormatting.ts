export const formatMockCardNumber = (value: string) => String(value || "")
  .replace(/\D/g, "")
  .slice(0, 16)
  .replace(/(\d{4})(?=\d)/g, "$1 ")
  .trim();

export const formatMockCardExpiry = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export const formatMockCardCvv = (value: string) => String(value || "").replace(/\D/g, "").slice(0, 4);
