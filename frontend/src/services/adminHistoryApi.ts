import { parseAdminJsonResponse } from "./adminSession";

export interface AdminHistoryItem {
  id: number;
  appointmentId?: number;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  service: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: string;
  paymentAmountCents: number;
  action: string;
  recordedAt: string;
}

export async function loadAdminHistory(): Promise<AdminHistoryItem[]> {
  const response = await fetch("/admin/appointments/history", {
    credentials: "same-origin"
  });
  const result = await parseAdminJsonResponse(response, "Could not load admin history.");

  return (result.history || []).map((item: any) => ({
    id: Number(item.id),
    appointmentId: item.appointment_id ? Number(item.appointment_id) : undefined,
    name: String(item.name || ""),
    phone: String(item.phone || ""),
    email: String(item.email || ""),
    vehicle: String(item.vehicle_details || ""),
    service: String(item.service_requested || "Service request"),
    date: String(item.date || ""),
    time: String(item.time || ""),
    status: String(item.status || ""),
    paymentStatus: String(item.payment_status || ""),
    paymentAmountCents: Number(item.payment_amount_cents || 0),
    action: String(item.action || ""),
    recordedAt: String(item.recorded_at || "")
  }));
}

export async function restoreAdminHistoryItem(historyId: number) {
  const response = await fetch(`/admin/appointments/history/${historyId}/restore`, {
    method: "POST",
    credentials: "same-origin"
  });

  const result = await parseAdminJsonResponse(response, "Could not restore appointment.");

  return {
    message: String(result.message || "Appointment restored.")
  };
}
