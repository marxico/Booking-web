export type AdminModuleKey =
  | "overview"
  | "requests"
  | "calendar"
  | "analytics"
  | "pricing"
  | "history"
  | "team"
  | "sales"
  | "profitability"
  | "servicesInvoiced"
  | "customer"
  | "labor"
  | "itemsSold"
  | "fee"
  | "discount"
  | "salesByServiceWriter"
  | "orders"
  | "outstandingInvoices"
  | "customerAging"
  | "deferredServicesReport"
  | "inventoryActivity"
  | "inventoryLevel"
  | "unusedInventory";

export type AdminSectionKey = "operations" | "performance" | "orderInvoice" | "inventoryManagement";

export interface AdminKpi {
  label: string;
  value: string;
  change?: string;
  tone?: "neutral" | "positive" | "warning";
}

export interface AdminTableColumn {
  key: string;
  label: string;
  type?: "text" | "currency" | "date" | "number" | "status";
}

export interface AdminFilterOption {
  label: string;
  value: string;
}

export interface AdminDatasetRecord {
  id: string;
  [key: string]: string | number | undefined;
}

export interface AdminModuleDataset {
  moduleKey: AdminModuleKey;
  title: string;
  description: string;
  section: AdminSectionKey;
  route: string;
  icon: string;
  pageTitle: string;
  kpis: AdminKpi[];
  columns: AdminTableColumn[];
  records: AdminDatasetRecord[];
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  exportFileName: string;
  filterLabel: string;
  filterField: string;
  filterOptions: AdminFilterOption[];
  dateField: string;
  searchFields: string[];
}

export interface AdminNavItem {
  label: string;
  route: string;
  icon: string;
  moduleKey: AdminModuleKey;
}

export interface AdminNavSection {
  key: AdminSectionKey;
  label: string;
  items: AdminNavItem[];
}

export interface OrderDetailLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrderDetail {
  id: string;
  customer: string;
  date: string;
  status: string;
  advisor: string;
  vehicle: string;
  total: number;
  paymentStatus: string;
  notes: string;
  lineItems: OrderDetailLineItem[];
  timeline: Array<{
    label: string;
    timestamp: string;
  }>;
}
