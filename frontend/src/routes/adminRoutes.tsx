import type { AdminNavSection } from "../types/admin";

export const adminNavigationSections: AdminNavSection[] = [
  {
    key: "operations",
    label: "Operations",
    items: [
      { label: "Overview", route: "/admin/operations/overview", icon: "overview", moduleKey: "overview" },
      { label: "Requests", route: "/admin/operations/requests", icon: "requests", moduleKey: "requests" },
      { label: "Calendar", route: "/admin/operations/calendar", icon: "calendar", moduleKey: "calendar" },
      { label: "Analytics", route: "/admin/operations/analytics", icon: "analytics", moduleKey: "analytics" },
      { label: "Pricing", route: "/admin/operations/pricing", icon: "pricing", moduleKey: "pricing" },
      { label: "History", route: "/admin/operations/history", icon: "history", moduleKey: "history" },
      { label: "Team", route: "/admin/operations/team", icon: "team", moduleKey: "team" }
    ]
  },
  {
    key: "performance",
    label: "Performance",
    items: [
      { label: "Sales", route: "/admin/performance/sales", icon: "chart", moduleKey: "sales" },
      { label: "Profitability", route: "/admin/performance/profitability", icon: "profit", moduleKey: "profitability" },
      { label: "Services invoiced", route: "/admin/performance/services-invoiced", icon: "invoice", moduleKey: "servicesInvoiced" },
      { label: "Customer", route: "/admin/performance/customer", icon: "users", moduleKey: "customer" },
      { label: "Labor", route: "/admin/performance/labor", icon: "labor", moduleKey: "labor" },
      { label: "Items sold", route: "/admin/performance/items-sold", icon: "items", moduleKey: "itemsSold" },
      { label: "Fee", route: "/admin/performance/fee", icon: "fee", moduleKey: "fee" },
      { label: "Discount", route: "/admin/performance/discount", icon: "discount", moduleKey: "discount" },
      { label: "Sales by Service Writer", route: "/admin/performance/sales-by-service-writer", icon: "writer", moduleKey: "salesByServiceWriter" }
    ]
  },
  {
    key: "orderInvoice",
    label: "Order & Invoice",
    items: [
      { label: "Orders", route: "/admin/order-invoice/orders", icon: "orders", moduleKey: "orders" },
      { label: "Outstanding invoices", route: "/admin/order-invoice/outstanding-invoices", icon: "outstanding", moduleKey: "outstandingInvoices" },
      { label: "Customer aging", route: "/admin/order-invoice/customer-aging", icon: "aging", moduleKey: "customerAging" },
      { label: "Deferred Services Report", route: "/admin/order-invoice/deferred-services-report", icon: "deferred", moduleKey: "deferredServicesReport" }
    ]
  },
  {
    key: "inventoryManagement",
    label: "Inventory Management",
    items: [
      { label: "Inventory activity", route: "/admin/inventory-management/inventory-activity", icon: "activity", moduleKey: "inventoryActivity" },
      { label: "Inventory level", route: "/admin/inventory-management/inventory-level", icon: "stock", moduleKey: "inventoryLevel" },
      { label: "Unused inventory", route: "/admin/inventory-management/unused-inventory", icon: "unused", moduleKey: "unusedInventory" }
    ]
  }
];
