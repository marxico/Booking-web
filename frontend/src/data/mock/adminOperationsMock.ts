export interface OperationsRequest {
  id: string;
  customer: string;
  vehicle: string;
  service: string;
  date: string;
  time: string;
  status: "Pending" | "Accepted" | "Canceled";
  payment: "Paid" | "Not required";
}

export interface OperationsPricingItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isBookingFee: boolean;
  active: boolean;
}

export interface OperationsTeamMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
  authProvider: string;
  status: "Active" | "Inactive";
}

export const operationsRequests: OperationsRequest[] = [
  { id: "REQ-401", customer: "Sophia Turner", vehicle: "2021 Honda Accord", service: "Brake inspection", date: "2026-04-11", time: "09:00 AM", status: "Pending", payment: "Paid" },
  { id: "REQ-402", customer: "Marcus Allen", vehicle: "2020 Ford F-150", service: "Battery replacement", date: "2026-04-11", time: "10:30 AM", status: "Accepted", payment: "Paid" },
  { id: "REQ-403", customer: "Evelyn Brooks", vehicle: "2019 Toyota Camry", service: "A/C recharge", date: "2026-04-12", time: "12:00 PM", status: "Pending", payment: "Not required" },
  { id: "REQ-404", customer: "Derek Foster", vehicle: "2022 Chevrolet Tahoe", service: "Oil change", date: "2026-04-12", time: "02:00 PM", status: "Canceled", payment: "Paid" },
  { id: "REQ-405", customer: "Jasmine Reed", vehicle: "2021 Nissan Altima", service: "Starter replacement", date: "2026-04-13", time: "03:30 PM", status: "Accepted", payment: "Paid" },
  { id: "REQ-406", customer: "Noah Jenkins", vehicle: "2018 Lexus RX 350", service: "Alternator diagnostics", date: "2026-04-14", time: "05:00 PM", status: "Pending", payment: "Paid" }
];

export const operationsHistory = [
  { id: "HIS-900", customer: "Victor Price", action: "Cleared to history", date: "2026-04-07", service: "Oil change", recordedAt: "2026-04-08 16:12" },
  { id: "HIS-901", customer: "Leah Martin", action: "Canceled by admin", date: "2026-04-06", service: "Battery replacement", recordedAt: "2026-04-06 12:45" },
  { id: "HIS-902", customer: "Isaac Carter", action: "Restored and rebooked", date: "2026-04-05", service: "Brake inspection", recordedAt: "2026-04-07 09:10" },
  { id: "HIS-903", customer: "Natalie Stone", action: "Archived after completion", date: "2026-04-03", service: "A/C recharge", recordedAt: "2026-04-04 18:05" }
];

export const operationsPricing: OperationsPricingItem[] = [
  { id: "PR-1", name: "Mobile Diagnostic Visit", description: "Required booking fee for dispatch.", price: 90, isBookingFee: true, active: true },
  { id: "PR-2", name: "Brake Service Inspection", description: "Brake system inspection and recommendation.", price: 125, isBookingFee: false, active: true },
  { id: "PR-3", name: "Battery & Charging Check", description: "Battery, alternator, and charging review.", price: 110, isBookingFee: false, active: true },
  { id: "PR-4", name: "Emergency Assistance", description: "Urgent mobile support visit.", price: 150, isBookingFee: false, active: false }
];

export const operationsTeam: OperationsTeamMember[] = [
  { id: "USR-1", displayName: "Lawson Admin", email: "admin@lawson.local", role: "Super Admin", authProvider: "Password", status: "Active" },
  { id: "USR-2", displayName: "Chris White", email: "chris@lawson.local", role: "Manager", authProvider: "Hybrid", status: "Active" },
  { id: "USR-3", displayName: "Ariana Cole", email: "ariana@lawson.local", role: "Analyst", authProvider: "Google", status: "Active" },
  { id: "USR-4", displayName: "Hannah Lee", email: "hannah@lawson.local", role: "Viewer", authProvider: "Password", status: "Inactive" }
];
