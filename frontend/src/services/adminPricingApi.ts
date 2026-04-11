import { parseAdminJsonResponse } from "./adminSession";

export interface AdminPricingEditorItem {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  discountType: "none" | "percent" | "fixed";
  discountValue: number;
  discountLabel: string;
  sortOrder: number;
  isBookingFee: boolean;
  isActive: boolean;
}

export async function loadAdminPricing(): Promise<AdminPricingEditorItem[]> {
  const response = await fetch("/admin/pricing", {
    credentials: "same-origin"
  });
  const result = await parseAdminJsonResponse(response, "Could not load admin pricing.");

  return (result.pricing || []).map((item: any, index: number) => ({
    code: String(item.code || ""),
    name: String(item.name || ""),
    description: String(item.description || ""),
    priceCents: Number(item.priceCents || 0),
    discountType: item.discountType === "percent" || item.discountType === "fixed" ? item.discountType : "none",
    discountValue: Number(item.discountValue || 0),
    discountLabel: String(item.discountLabel || ""),
    sortOrder: Number(item.sortOrder || index + 1),
    isBookingFee: Boolean(item.isBookingFee),
    isActive: Boolean(item.isActive)
  }));
}

export async function saveAdminPricing(items: AdminPricingEditorItem[]) {
  const response = await fetch("/admin/pricing", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify({
      items
    })
  });

  const result = await parseAdminJsonResponse(response, "Could not save admin pricing.");

  return {
    message: String(result.message || "Pricing saved."),
    pricing: (result.pricing || []).map((item: any, index: number) => ({
      code: String(item.code || ""),
      name: String(item.name || ""),
      description: String(item.description || ""),
      priceCents: Number(item.priceCents || 0),
      discountType: item.discountType === "percent" || item.discountType === "fixed" ? item.discountType : "none",
      discountValue: Number(item.discountValue || 0),
      discountLabel: String(item.discountLabel || ""),
      sortOrder: Number(item.sortOrder || index + 1),
      isBookingFee: Boolean(item.isBookingFee),
      isActive: Boolean(item.isActive)
    }))
  };
}
