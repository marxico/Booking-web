import { parseAdminJsonResponse } from "./adminSession";

export interface AdminAppointment {
  id: number;
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
  bookingSource: string;
}

const normalizeStatus = (value: string) => {
  const status = String(value || "").toLowerCase();
  return status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "Pending";
};

export async function loadAdminAppointments(): Promise<AdminAppointment[]> {
  const response = await fetch("/admin/appointments", {
    credentials: "same-origin"
  });
  const result = await parseAdminJsonResponse(response, "Could not load appointments.");

  return (result.appointments || []).map((item: any) => ({
    id: Number(item.id),
    name: String(item.name || ""),
    phone: String(item.phone || ""),
    email: String(item.email || ""),
    vehicle: String(item.vehicle_details || "Vehicle not provided"),
    service: String(item.service_requested || "Service request"),
    date: String(item.date || ""),
    time: String(item.time || ""),
    status: normalizeStatus(item.status),
    paymentStatus: normalizeStatus(item.payment_status),
    paymentAmountCents: Number(item.payment_amount_cents || 0),
    bookingSource: String(item.booking_source || "square")
  }));
}

export async function updateAdminAppointmentStatus(appointmentId: number, status: "accepted" | "canceled") {
  const response = await fetch(`/admin/appointments/${appointmentId}/status`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  return parseAdminJsonResponse(response, "Could not update appointment.");
}
