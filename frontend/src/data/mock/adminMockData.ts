import type { AdminModuleDataset, AdminModuleKey, OrderDetail } from "../../types/admin";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const baseDates = [
  "2026-04-11",
  "2026-04-10",
  "2026-04-09",
  "2026-04-08",
  "2026-04-07",
  "2026-04-06",
  "2026-04-05",
  "2026-04-04",
  "2026-04-03",
  "2026-04-02",
  "2026-04-01",
  "2026-03-31"
];

const customers = [
  "Sophia Turner",
  "Marcus Allen",
  "Evelyn Brooks",
  "Derek Foster",
  "Jasmine Reed",
  "Noah Jenkins",
  "Amara Hall",
  "Victor Price",
  "Leah Martin",
  "Isaac Carter",
  "Natalie Stone",
  "Julian Ross"
];

const advisors = ["Chris White", "Ariana Cole", "Miguel Torres", "Hannah Lee"];
const technicians = ["Andre Cole", "Mia Lawson", "Victor James", "Ethan Ward"];
const vehicles = [
  "2021 Honda Accord",
  "2020 Ford F-150",
  "2019 Toyota Camry",
  "2022 Chevrolet Tahoe",
  "2021 Nissan Altima",
  "2018 Lexus RX 350"
];
const services = [
  "Brake inspection",
  "Battery replacement",
  "Oil change",
  "Alternator diagnostics",
  "A/C recharge",
  "Starter replacement"
];

const orderRows = baseDates.map((date, index) => {
  const total = 210 + index * 37;
  return {
    id: `ORD-${1024 + index}`,
    orderId: `ORD-${1024 + index}`,
    status: index % 4 === 0 ? "In Progress" : index % 3 === 0 ? "Closed" : "Ready for Pickup",
    customer: customers[index],
    date,
    total,
    totalDisplay: money(total),
    vehicle: vehicles[index % vehicles.length],
    advisor: advisors[index % advisors.length],
    service: services[index % services.length],
    paymentStatus: index % 2 === 0 ? "Paid" : "Pending"
  };
});

const moduleData: Partial<Record<AdminModuleKey, AdminModuleDataset>> = {
  sales: {
    moduleKey: "sales",
    title: "Sales",
    description: "Track total sales, cadence by period, and transaction-level performance across the shop.",
    section: "performance",
    route: "/admin/performance/sales",
    icon: "chart",
    pageTitle: "Sales",
    kpis: [
      { label: "Total sales", value: money(54210), change: "+12.4% vs last month", tone: "positive" },
      { label: "Today", value: money(4180), change: "18 invoices closed", tone: "neutral" },
      { label: "This week", value: money(18430), change: "63 transactions", tone: "positive" },
      { label: "This month", value: money(54210), change: "Average ticket $423", tone: "neutral" }
    ],
    columns: [
      { key: "transactionId", label: "Transaction" },
      { key: "customer", label: "Customer" },
      { key: "service", label: "Service" },
      { key: "serviceWriter", label: "Service writer" },
      { key: "paymentMethod", label: "Payment method" },
      { key: "date", label: "Date", type: "date" },
      { key: "amountDisplay", label: "Amount", type: "currency" }
    ],
    records: baseDates.map((date, index) => ({
      id: `TX-${8001 + index}`,
      transactionId: `TX-${8001 + index}`,
      customer: customers[index],
      service: services[index % services.length],
      serviceWriter: advisors[index % advisors.length],
      paymentMethod: index % 2 === 0 ? "Card" : index % 3 === 0 ? "Cash" : "Fleet Account",
      date,
      period: index < 2 ? "Daily" : index < 7 ? "Weekly" : "Monthly",
      amountDisplay: money(160 + index * 42)
    })),
    searchPlaceholder: "Search transaction, customer or writer",
    emptyTitle: "No sales matched these filters",
    emptyDescription: "Try widening the date range or clearing the period filter.",
    exportFileName: "sales-report",
    filterLabel: "Period",
    filterField: "period",
    filterOptions: [
      { label: "All periods", value: "all" },
      { label: "Daily", value: "Daily" },
      { label: "Weekly", value: "Weekly" },
      { label: "Monthly", value: "Monthly" }
    ],
    dateField: "date",
    searchFields: ["transactionId", "customer", "serviceWriter", "service"]
  },
  profitability: {
    moduleKey: "profitability",
    title: "Profitability",
    description: "See revenue, cost, margin, and gross profit by service category to spot where the shop earns best.",
    section: "performance",
    route: "/admin/performance/profitability",
    icon: "profit",
    pageTitle: "Profitability",
    kpis: [
      { label: "Revenue", value: money(54210), change: "+8.2%", tone: "positive" },
      { label: "Cost", value: money(31940), change: "58.9% of revenue", tone: "warning" },
      { label: "Gross profit", value: money(22270), change: "+11.7%", tone: "positive" },
      { label: "Margin", value: "41.1%", change: "Target 40%", tone: "positive" }
    ],
    columns: [
      { key: "category", label: "Category" },
      { key: "service", label: "Service" },
      { key: "revenueDisplay", label: "Revenue", type: "currency" },
      { key: "costDisplay", label: "Cost", type: "currency" },
      { key: "profitDisplay", label: "Profit", type: "currency" },
      { key: "margin", label: "Margin" },
      { key: "date", label: "Date", type: "date" }
    ],
    records: services.map((service, index) => {
      const revenue = 4200 + index * 950;
      const cost = 2100 + index * 510;
      const profit = revenue - cost;
      return {
        id: `PF-${index + 1}`,
        category: index % 2 === 0 ? "Repair" : "Maintenance",
        service,
        revenueDisplay: money(revenue),
        costDisplay: money(cost),
        profitDisplay: money(profit),
        margin: `${Math.round((profit / revenue) * 100)}%`,
        date: baseDates[index]
      };
    }),
    searchPlaceholder: "Search category or service",
    emptyTitle: "No profitability data found",
    emptyDescription: "No categories matched this search and filter combination.",
    exportFileName: "profitability-report",
    filterLabel: "Category",
    filterField: "category",
    filterOptions: [
      { label: "All categories", value: "all" },
      { label: "Repair", value: "Repair" },
      { label: "Maintenance", value: "Maintenance" }
    ],
    dateField: "date",
    searchFields: ["category", "service"]
  },
  servicesInvoiced: {
    moduleKey: "servicesInvoiced",
    title: "Services invoiced",
    description: "Review invoiced services with customer, payment method, status, and billed amount.",
    section: "performance",
    route: "/admin/performance/services-invoiced",
    icon: "invoice",
    pageTitle: "Services Invoiced",
    kpis: [
      { label: "Invoices issued", value: "128", change: "+14 this week", tone: "positive" },
      { label: "Collected", value: money(49800), change: "92.1% collection rate", tone: "positive" },
      { label: "Open invoices", value: "11", change: "Needs follow-up", tone: "warning" },
      { label: "Average invoice", value: money(389), change: "Across 30 days", tone: "neutral" }
    ],
    columns: [
      { key: "invoiceId", label: "Invoice" },
      { key: "service", label: "Service" },
      { key: "customer", label: "Customer" },
      { key: "date", label: "Date", type: "date" },
      { key: "paymentMethod", label: "Payment method" },
      { key: "status", label: "Status", type: "status" },
      { key: "amountDisplay", label: "Amount", type: "currency" }
    ],
    records: baseDates.map((date, index) => ({
      id: `INV-${6600 + index}`,
      invoiceId: `INV-${6600 + index}`,
      service: services[index % services.length],
      customer: customers[index],
      date,
      paymentMethod: index % 2 === 0 ? "Visa" : "ACH",
      status: index % 4 === 0 ? "Pending" : "Paid",
      amountDisplay: money(190 + index * 35)
    })),
    searchPlaceholder: "Search invoice, service or customer",
    emptyTitle: "No services invoiced matched",
    emptyDescription: "Try a different invoice status or clear the search term.",
    exportFileName: "services-invoiced",
    filterLabel: "Invoice status",
    filterField: "status",
    filterOptions: [
      { label: "All statuses", value: "all" },
      { label: "Paid", value: "Paid" },
      { label: "Pending", value: "Pending" }
    ],
    dateField: "date",
    searchFields: ["invoiceId", "service", "customer"]
  },
  customer: {
    moduleKey: "customer",
    title: "Customer",
    description: "Monitor customer value, most recent visit, and relationship health at a glance.",
    section: "performance",
    route: "/admin/performance/customer",
    icon: "users",
    pageTitle: "Customer",
    kpis: [
      { label: "Customers served", value: "342", change: "+22 this month", tone: "positive" },
      { label: "Repeat rate", value: "64%", change: "Up 5 points", tone: "positive" },
      { label: "Average lifetime value", value: money(1280), change: "12-month basis", tone: "neutral" },
      { label: "At-risk accounts", value: "19", change: "No visit in 90+ days", tone: "warning" }
    ],
    columns: [
      { key: "customer", label: "Customer" },
      { key: "segment", label: "Segment" },
      { key: "totalSpentDisplay", label: "Total spent", type: "currency" },
      { key: "lastVisit", label: "Last visit", type: "date" },
      { key: "visits", label: "Visits", type: "number" },
      { key: "summary", label: "History summary" }
    ],
    records: customers.map((customer, index) => ({
      id: `CUST-${index + 1}`,
      customer,
      segment: index % 3 === 0 ? "Fleet" : index % 2 === 0 ? "VIP" : "Retail",
      totalSpentDisplay: money(420 + index * 210),
      lastVisit: baseDates[index],
      visits: 2 + index,
      summary: `${services[index % services.length]} and follow-up inspection`
    })),
    searchPlaceholder: "Search customer or segment",
    emptyTitle: "No customers matched",
    emptyDescription: "No customer records match the selected segment or search query.",
    exportFileName: "customer-report",
    filterLabel: "Segment",
    filterField: "segment",
    filterOptions: [
      { label: "All segments", value: "all" },
      { label: "Retail", value: "Retail" },
      { label: "VIP", value: "VIP" },
      { label: "Fleet", value: "Fleet" }
    ],
    dateField: "lastVisit",
    searchFields: ["customer", "segment", "summary"]
  },
  labor: {
    moduleKey: "labor",
    title: "Labor",
    description: "Compare hours worked, labor cost, utilization, and technician performance over time.",
    section: "performance",
    route: "/admin/performance/labor",
    icon: "labor",
    pageTitle: "Labor",
    kpis: [
      { label: "Hours worked", value: "486", change: "+26 vs prior period", tone: "positive" },
      { label: "Labor cost", value: money(17340), change: "Avg $35.7/hour", tone: "neutral" },
      { label: "Utilization", value: "82%", change: "Strong bay usage", tone: "positive" },
      { label: "Overtime", value: "18.5 hrs", change: "Watch staffing", tone: "warning" }
    ],
    columns: [
      { key: "technician", label: "Employee / Tech" },
      { key: "date", label: "Date", type: "date" },
      { key: "hours", label: "Hours", type: "number" },
      { key: "laborRateDisplay", label: "Rate", type: "currency" },
      { key: "costDisplay", label: "Cost", type: "currency" },
      { key: "status", label: "Status", type: "status" }
    ],
    records: baseDates.map((date, index) => {
      const hours = 6 + (index % 4) * 1.5;
      const laborRate = 38 + index;
      return {
        id: `LAB-${index + 1}`,
        technician: technicians[index % technicians.length],
        date,
        hours,
        laborRateDisplay: money(laborRate),
        costDisplay: money(Math.round(hours * laborRate)),
        status: hours > 9 ? "Overtime" : "Scheduled"
      };
    }),
    searchPlaceholder: "Search technician",
    emptyTitle: "No labor entries found",
    emptyDescription: "The selected date range and labor filter returned no records.",
    exportFileName: "labor-report",
    filterLabel: "Labor status",
    filterField: "status",
    filterOptions: [
      { label: "All labor statuses", value: "all" },
      { label: "Scheduled", value: "Scheduled" },
      { label: "Overtime", value: "Overtime" }
    ],
    dateField: "date",
    searchFields: ["technician", "status"]
  },
  itemsSold: {
    moduleKey: "itemsSold",
    title: "Items sold",
    description: "Track units sold, revenue contribution, and best-selling parts or merchandise.",
    section: "performance",
    route: "/admin/performance/items-sold",
    icon: "items",
    pageTitle: "Items Sold",
    kpis: [
      { label: "Items sold", value: "612", change: "+9.3%", tone: "positive" },
      { label: "Revenue", value: money(28740), change: "Parts + consumables", tone: "neutral" },
      { label: "Top seller", value: "Brake pad kit", change: "84 units", tone: "positive" },
      { label: "Attach rate", value: "46%", change: "On repair orders", tone: "neutral" }
    ],
    columns: [
      { key: "item", label: "Item" },
      { key: "category", label: "Category" },
      { key: "sku", label: "SKU" },
      { key: "quantity", label: "Qty", type: "number" },
      { key: "revenueDisplay", label: "Revenue", type: "currency" },
      { key: "rank", label: "Rank" },
      { key: "date", label: "Date", type: "date" }
    ],
    records: [
      "Brake pad kit",
      "Battery terminal",
      "Air filter",
      "Alternator belt",
      "Cabin filter",
      "Starter motor",
      "Spark plug set",
      "Wiper blades"
    ].map((item, index) => ({
      id: `ITEM-${index + 1}`,
      item,
      category: index % 2 === 0 ? "Parts" : "Maintenance",
      sku: `SKU-${2100 + index}`,
      quantity: 14 + index * 3,
      revenueDisplay: money(340 + index * 175),
      rank: `#${index + 1}`,
      date: baseDates[index]
    })),
    searchPlaceholder: "Search item or SKU",
    emptyTitle: "No sold items found",
    emptyDescription: "Try another item category or search term.",
    exportFileName: "items-sold",
    filterLabel: "Category",
    filterField: "category",
    filterOptions: [
      { label: "All categories", value: "all" },
      { label: "Parts", value: "Parts" },
      { label: "Maintenance", value: "Maintenance" }
    ],
    dateField: "date",
    searchFields: ["item", "sku", "category"]
  },
  fee: {
    moduleKey: "fee",
    title: "Fee",
    description: "Monitor applied fees by type, amount, order, and customer to protect margins.",
    section: "performance",
    route: "/admin/performance/fee",
    icon: "fee",
    pageTitle: "Fee",
    kpis: [
      { label: "Fees applied", value: money(4820), change: "Across 74 orders", tone: "neutral" },
      { label: "Diagnostic fees", value: money(2140), change: "Largest fee bucket", tone: "positive" },
      { label: "Environmental fees", value: money(960), change: "Stable cadence", tone: "neutral" },
      { label: "Waived fees", value: money(280), change: "7 exceptions", tone: "warning" }
    ],
    columns: [
      { key: "feeType", label: "Fee type" },
      { key: "orderId", label: "Order" },
      { key: "customer", label: "Customer" },
      { key: "amountDisplay", label: "Amount", type: "currency" },
      { key: "status", label: "Status", type: "status" },
      { key: "date", label: "Date", type: "date" }
    ],
    records: baseDates.map((date, index) => ({
      id: `FEE-${index + 1}`,
      feeType: index % 2 === 0 ? "Diagnostic fee" : "Environmental fee",
      orderId: orderRows[index].orderId,
      customer: customers[index],
      amountDisplay: money(18 + index * 4),
      status: index % 5 === 0 ? "Waived" : "Applied",
      date
    })),
    searchPlaceholder: "Search fee, order or customer",
    emptyTitle: "No fee records found",
    emptyDescription: "There are no fees for the selected filters yet.",
    exportFileName: "fees-report",
    filterLabel: "Fee status",
    filterField: "status",
    filterOptions: [
      { label: "All fee statuses", value: "all" },
      { label: "Applied", value: "Applied" },
      { label: "Waived", value: "Waived" }
    ],
    dateField: "date",
    searchFields: ["feeType", "orderId", "customer"]
  },
  discount: {
    moduleKey: "discount",
    title: "Discount",
    description: "Review which discounts were applied, why they were given, and who received them.",
    section: "performance",
    route: "/admin/performance/discount",
    icon: "discount",
    pageTitle: "Discount",
    kpis: [
      { label: "Discounts granted", value: money(3610), change: "Across 39 tickets", tone: "warning" },
      { label: "Average discount", value: money(93), change: "Customer retention heavy", tone: "neutral" },
      { label: "Top reason", value: "Loyalty", change: "41% of discounts", tone: "positive" },
      { label: "Recovered revenue", value: "68%", change: "From repeat visits", tone: "positive" }
    ],
    columns: [
      { key: "reason", label: "Reason" },
      { key: "customer", label: "Customer" },
      { key: "service", label: "Service" },
      { key: "channel", label: "Associated with" },
      { key: "totalDiscountDisplay", label: "Total discounted", type: "currency" },
      { key: "date", label: "Date", type: "date" }
    ],
    records: baseDates.map((date, index) => ({
      id: `DISC-${index + 1}`,
      reason: index % 2 === 0 ? "Loyalty" : index % 3 === 0 ? "Warranty goodwill" : "Promotional offer",
      customer: customers[index],
      service: services[index % services.length],
      channel: index % 2 === 0 ? "Customer" : "Service",
      totalDiscountDisplay: money(22 + index * 8),
      date
    })),
    searchPlaceholder: "Search discount reason or customer",
    emptyTitle: "No discounts matched",
    emptyDescription: "Try clearing the associated-with filter or widening the date range.",
    exportFileName: "discount-report",
    filterLabel: "Associated with",
    filterField: "channel",
    filterOptions: [
      { label: "All associations", value: "all" },
      { label: "Customer", value: "Customer" },
      { label: "Service", value: "Service" }
    ],
    dateField: "date",
    searchFields: ["reason", "customer", "service"]
  },
  salesByServiceWriter: {
    moduleKey: "salesByServiceWriter",
    title: "Sales by Service Writer",
    description: "Compare advisors by total sales, ticket average, and order count.",
    section: "performance",
    route: "/admin/performance/sales-by-service-writer",
    icon: "writer",
    pageTitle: "Sales by Service Writer",
    kpis: [
      { label: "Top writer", value: "Chris White", change: money(18420), tone: "positive" },
      { label: "Orders handled", value: "143", change: "Across all writers", tone: "neutral" },
      { label: "Average ticket", value: money(402), change: "+6.2%", tone: "positive" },
      { label: "Close rate", value: "78%", change: "Shop average", tone: "neutral" }
    ],
    columns: [
      { key: "writer", label: "Service writer" },
      { key: "orders", label: "Orders", type: "number" },
      { key: "totalSalesDisplay", label: "Total sales", type: "currency" },
      { key: "averageDisplay", label: "Average", type: "currency" },
      { key: "closeRate", label: "Close rate" },
      { key: "date", label: "Period ending", type: "date" }
    ],
    records: advisors.map((writer, index) => {
      const totalSales = 10800 + index * 2510;
      const orders = 28 + index * 9;
      return {
        id: `WR-${index + 1}`,
        writer,
        orders,
        totalSalesDisplay: money(totalSales),
        averageDisplay: money(Math.round(totalSales / orders)),
        closeRate: `${74 + index * 2}%`,
        date: baseDates[index]
      };
    }),
    searchPlaceholder: "Search service writer",
    emptyTitle: "No writer performance data found",
    emptyDescription: "Try another period or clear the search text.",
    exportFileName: "sales-by-service-writer",
    filterLabel: "Writer status",
    filterField: "closeRate",
    filterOptions: [
      { label: "All close rates", value: "all" },
      { label: "74%", value: "74%" },
      { label: "76%", value: "76%" },
      { label: "78%", value: "78%" },
      { label: "80%", value: "80%" }
    ],
    dateField: "date",
    searchFields: ["writer"]
  },
  orders: {
    moduleKey: "orders",
    title: "Orders",
    description: "Manage active and completed orders, inspect order totals, and jump into full order details.",
    section: "orderInvoice",
    route: "/admin/order-invoice/orders",
    icon: "orders",
    pageTitle: "Orders",
    kpis: [
      { label: "Open orders", value: "24", change: "8 due today", tone: "warning" },
      { label: "Closed today", value: "18", change: "Strong throughput", tone: "positive" },
      { label: "Average order", value: money(418), change: "Last 30 days", tone: "neutral" },
      { label: "Pending payment", value: "7", change: "Needs collection", tone: "warning" }
    ],
    columns: [
      { key: "orderId", label: "Order" },
      { key: "status", label: "Status", type: "status" },
      { key: "customer", label: "Customer" },
      { key: "date", label: "Date", type: "date" },
      { key: "vehicle", label: "Vehicle" },
      { key: "advisor", label: "Advisor" },
      { key: "totalDisplay", label: "Total", type: "currency" }
    ],
    records: orderRows,
    searchPlaceholder: "Search order, customer or vehicle",
    emptyTitle: "No orders matched",
    emptyDescription: "No orders fit the selected status and date range.",
    exportFileName: "orders-report",
    filterLabel: "Order status",
    filterField: "status",
    filterOptions: [
      { label: "All statuses", value: "all" },
      { label: "In Progress", value: "In Progress" },
      { label: "Ready for Pickup", value: "Ready for Pickup" },
      { label: "Closed", value: "Closed" }
    ],
    dateField: "date",
    searchFields: ["orderId", "customer", "vehicle", "advisor"]
  },
  outstandingInvoices: {
    moduleKey: "outstandingInvoices",
    title: "Outstanding invoices",
    description: "Stay on top of overdue balances with due dates, customer name, and days past due.",
    section: "orderInvoice",
    route: "/admin/order-invoice/outstanding-invoices",
    icon: "outstanding",
    pageTitle: "Outstanding Invoices",
    kpis: [
      { label: "Outstanding balance", value: money(12390), change: "11 invoices", tone: "warning" },
      { label: "Past due 0-30", value: money(4680), change: "Most recoverable", tone: "neutral" },
      { label: "Past due 31-60", value: money(3520), change: "Needs follow-up", tone: "warning" },
      { label: "Past due 60+", value: money(4190), change: "Escalation risk", tone: "warning" }
    ],
    columns: [
      { key: "invoiceId", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "dueDate", label: "Due date", type: "date" },
      { key: "daysPastDue", label: "Days past due", type: "number" },
      { key: "status", label: "Status", type: "status" },
      { key: "amountDisplay", label: "Outstanding", type: "currency" }
    ],
    records: baseDates.slice(0, 10).map((date, index) => ({
      id: `OINV-${index + 1}`,
      invoiceId: `OINV-${7100 + index}`,
      customer: customers[index],
      dueDate: date,
      daysPastDue: 6 + index * 8,
      status: index < 4 ? "0-30 Days" : index < 7 ? "31-60 Days" : "61+ Days",
      amountDisplay: money(220 + index * 60)
    })),
    searchPlaceholder: "Search invoice or customer",
    emptyTitle: "No outstanding invoices found",
    emptyDescription: "No outstanding invoices match the selected aging bucket.",
    exportFileName: "outstanding-invoices",
    filterLabel: "Aging bucket",
    filterField: "status",
    filterOptions: [
      { label: "All buckets", value: "all" },
      { label: "0-30 Days", value: "0-30 Days" },
      { label: "31-60 Days", value: "31-60 Days" },
      { label: "61+ Days", value: "61+ Days" }
    ],
    dateField: "dueDate",
    searchFields: ["invoiceId", "customer"]
  },
  customerAging: {
    moduleKey: "customerAging",
    title: "Customer aging",
    description: "View aging by customer with standard receivables buckets and total exposure.",
    section: "orderInvoice",
    route: "/admin/order-invoice/customer-aging",
    icon: "aging",
    pageTitle: "Customer Aging",
    kpis: [
      { label: "A/R total", value: money(28340), change: "Across all customers", tone: "warning" },
      { label: "0-30 days", value: money(12480), change: "44% of total", tone: "neutral" },
      { label: "31-60 days", value: money(8360), change: "Monitor carefully", tone: "warning" },
      { label: "90+ days", value: money(2540), change: "Collections focus", tone: "warning" }
    ],
    columns: [
      { key: "customer", label: "Customer" },
      { key: "bucket0to30", label: "0-30", type: "currency" },
      { key: "bucket31to60", label: "31-60", type: "currency" },
      { key: "bucket61to90", label: "61-90", type: "currency" },
      { key: "bucket90Plus", label: "90+", type: "currency" },
      { key: "total", label: "Total", type: "currency" }
    ],
    records: customers.slice(0, 10).map((customer, index) => {
      const current = 360 + index * 70;
      const bucket31 = index % 2 === 0 ? 120 + index * 40 : 0;
      const bucket61 = index % 3 === 0 ? 85 + index * 25 : 0;
      const bucket90 = index % 4 === 0 ? 60 + index * 20 : 0;
      return {
        id: `AGING-${index + 1}`,
        customer,
        bucket0to30: money(current),
        bucket31to60: money(bucket31),
        bucket61to90: money(bucket61),
        bucket90Plus: money(bucket90),
        total: money(current + bucket31 + bucket61 + bucket90)
      };
    }),
    searchPlaceholder: "Search customer aging",
    emptyTitle: "No aging records found",
    emptyDescription: "There are no aging records for the selected customer group.",
    exportFileName: "customer-aging",
    filterLabel: "Risk bucket",
    filterField: "bucket90Plus",
    filterOptions: [
      { label: "All customers", value: "all" },
      { label: "$0", value: "$0" },
      { label: "$60", value: "$60" },
      { label: "$140", value: "$140" }
    ],
    dateField: "customer",
    searchFields: ["customer"]
  },
  deferredServicesReport: {
    moduleKey: "deferredServicesReport",
    title: "Deferred Services Report",
    description: "Surface recommended work that was declined or postponed, with estimated value and context.",
    section: "orderInvoice",
    route: "/admin/order-invoice/deferred-services-report",
    icon: "deferred",
    pageTitle: "Deferred Services Report",
    kpis: [
      { label: "Deferred value", value: money(17420), change: "Pipeline opportunity", tone: "warning" },
      { label: "Deferred services", value: "37", change: "Across 31 customers", tone: "neutral" },
      { label: "Top category", value: "Brake service", change: money(4860), tone: "warning" },
      { label: "Recent advisor", value: "Ariana Cole", change: "Most recommendations", tone: "positive" }
    ],
    columns: [
      { key: "customer", label: "Customer" },
      { key: "vehicle", label: "Vehicle" },
      { key: "service", label: "Deferred service" },
      { key: "advisor", label: "Advisor" },
      { key: "estimatedValueDisplay", label: "Estimated value", type: "currency" },
      { key: "date", label: "Recommended", type: "date" }
    ],
    records: baseDates.slice(0, 10).map((date, index) => ({
      id: `DEF-${index + 1}`,
      customer: customers[index],
      vehicle: vehicles[index % vehicles.length],
      service: services[index % services.length],
      advisor: advisors[index % advisors.length],
      estimatedValueDisplay: money(260 + index * 95),
      date
    })),
    searchPlaceholder: "Search customer, vehicle or service",
    emptyTitle: "No deferred services found",
    emptyDescription: "Try widening the date range to surface postponed work.",
    exportFileName: "deferred-services-report",
    filterLabel: "Advisor",
    filterField: "advisor",
    filterOptions: [
      { label: "All advisors", value: "all" },
      { label: "Chris White", value: "Chris White" },
      { label: "Ariana Cole", value: "Ariana Cole" },
      { label: "Miguel Torres", value: "Miguel Torres" },
      { label: "Hannah Lee", value: "Hannah Lee" }
    ],
    dateField: "date",
    searchFields: ["customer", "vehicle", "service", "advisor"]
  },
  inventoryActivity: {
    moduleKey: "inventoryActivity",
    title: "Inventory activity",
    description: "Review stock movement, adjustments, and the user responsible for each change.",
    section: "inventoryManagement",
    route: "/admin/inventory-management/inventory-activity",
    icon: "activity",
    pageTitle: "Inventory Activity",
    kpis: [
      { label: "Inbound moves", value: "94", change: "+11 this week", tone: "positive" },
      { label: "Outbound moves", value: "126", change: "Driven by service demand", tone: "neutral" },
      { label: "Adjustments", value: "12", change: "Cycle count variance", tone: "warning" },
      { label: "Users active", value: "7", change: "Warehouse + advisors", tone: "neutral" }
    ],
    columns: [
      { key: "activityId", label: "Activity" },
      { key: "item", label: "Item" },
      { key: "movementType", label: "Movement" },
      { key: "quantity", label: "Qty", type: "number" },
      { key: "user", label: "User responsible" },
      { key: "date", label: "Date", type: "date" }
    ],
    records: baseDates.map((date, index) => ({
      id: `ACT-${index + 1}`,
      activityId: `ACT-${5300 + index}`,
      item: ["Brake pad kit", "Battery terminal", "Coolant", "Starter motor"][index % 4],
      movementType: index % 3 === 0 ? "Adjustment" : index % 2 === 0 ? "Stock In" : "Stock Out",
      quantity: index % 3 === 0 ? 2 : 4 + index,
      user: advisors[index % advisors.length],
      date
    })),
    searchPlaceholder: "Search activity, item or user",
    emptyTitle: "No inventory activity found",
    emptyDescription: "No stock movement matches the selected movement type.",
    exportFileName: "inventory-activity",
    filterLabel: "Movement type",
    filterField: "movementType",
    filterOptions: [
      { label: "All movement types", value: "all" },
      { label: "Stock In", value: "Stock In" },
      { label: "Stock Out", value: "Stock Out" },
      { label: "Adjustment", value: "Adjustment" }
    ],
    dateField: "date",
    searchFields: ["activityId", "item", "user"]
  },
  inventoryLevel: {
    moduleKey: "inventoryLevel",
    title: "Inventory level",
    description: "Check current stock, min-max thresholds, and low-stock alerts before service is impacted.",
    section: "inventoryManagement",
    route: "/admin/inventory-management/inventory-level",
    icon: "stock",
    pageTitle: "Inventory Level",
    kpis: [
      { label: "SKUs tracked", value: "184", change: "Across active bins", tone: "neutral" },
      { label: "Low stock alerts", value: "13", change: "Replenishment needed", tone: "warning" },
      { label: "Healthy stock", value: "153", change: "Above minimum", tone: "positive" },
      { label: "Overstock", value: "18", change: "Tied-up capital", tone: "warning" }
    ],
    columns: [
      { key: "item", label: "Item" },
      { key: "category", label: "Category" },
      { key: "currentStock", label: "Current", type: "number" },
      { key: "minStock", label: "Min", type: "number" },
      { key: "maxStock", label: "Max", type: "number" },
      { key: "status", label: "Alert", type: "status" }
    ],
    records: [
      ["Brake pad kit", "Parts", 8, 10, 28, "Low stock"],
      ["Battery terminal", "Electrical", 21, 8, 30, "Healthy"],
      ["Starter motor", "Electrical", 4, 6, 18, "Low stock"],
      ["Coolant gallon", "Fluids", 32, 12, 36, "Healthy"],
      ["Oil filter", "Maintenance", 41, 15, 50, "Healthy"],
      ["A/C refrigerant", "Fluids", 6, 8, 24, "Low stock"],
      ["Spark plug set", "Ignition", 26, 10, 34, "Healthy"],
      ["Wiper blades", "Accessories", 38, 12, 40, "Overstock"]
    ].map((entry, index) => ({
      id: `STOCK-${index + 1}`,
      item: entry[0] as string,
      category: entry[1] as string,
      currentStock: entry[2] as number,
      minStock: entry[3] as number,
      maxStock: entry[4] as number,
      status: entry[5] as string
    })),
    searchPlaceholder: "Search SKU or item",
    emptyTitle: "No inventory levels found",
    emptyDescription: "No inventory levels matched the selected alert state.",
    exportFileName: "inventory-level",
    filterLabel: "Alert status",
    filterField: "status",
    filterOptions: [
      { label: "All alert statuses", value: "all" },
      { label: "Healthy", value: "Healthy" },
      { label: "Low stock", value: "Low stock" },
      { label: "Overstock", value: "Overstock" }
    ],
    dateField: "item",
    searchFields: ["item", "category"]
  },
  unusedInventory: {
    moduleKey: "unusedInventory",
    title: "Unused inventory",
    description: "Identify parts with no recent movement so purchasing and storage decisions stay tight.",
    section: "inventoryManagement",
    route: "/admin/inventory-management/unused-inventory",
    icon: "unused",
    pageTitle: "Unused Inventory",
    kpis: [
      { label: "Unused SKUs", value: "27", change: "No movement in 60+ days", tone: "warning" },
      { label: "Accumulated value", value: money(8940), change: "Capital tied up", tone: "warning" },
      { label: "Longest idle", value: "143 days", change: "Starter relay kit", tone: "warning" },
      { label: "Review candidates", value: "11", change: "Potential write-downs", tone: "neutral" }
    ],
    columns: [
      { key: "item", label: "Item" },
      { key: "category", label: "Category" },
      { key: "lastMovementDate", label: "Last movement", type: "date" },
      { key: "daysUnused", label: "Days unused", type: "number" },
      { key: "accumulatedValueDisplay", label: "Accumulated value", type: "currency" },
      { key: "status", label: "Status", type: "status" }
    ],
    records: [
      ["Starter relay kit", "Electrical", "2025-11-19", 143, 880, "Review"],
      ["Fuel injector seal", "Fuel", "2025-12-02", 129, 540, "Review"],
      ["Alternator bracket", "Electrical", "2026-01-06", 94, 710, "Hold"],
      ["Timing cover gasket", "Engine", "2026-01-14", 86, 430, "Hold"],
      ["Wheel stud pack", "Chassis", "2026-01-21", 79, 620, "Review"],
      ["Radiator cap", "Cooling", "2026-01-28", 72, 290, "Hold"]
    ].map((entry, index) => ({
      id: `UNUSED-${index + 1}`,
      item: entry[0] as string,
      category: entry[1] as string,
      lastMovementDate: entry[2] as string,
      daysUnused: entry[3] as number,
      accumulatedValueDisplay: money(entry[4] as number),
      status: entry[5] as string
    })),
    searchPlaceholder: "Search unused inventory",
    emptyTitle: "No unused inventory matched",
    emptyDescription: "Try another idle status or clear the search.",
    exportFileName: "unused-inventory",
    filterLabel: "Idle status",
    filterField: "status",
    filterOptions: [
      { label: "All statuses", value: "all" },
      { label: "Review", value: "Review" },
      { label: "Hold", value: "Hold" }
    ],
    dateField: "lastMovementDate",
    searchFields: ["item", "category", "status"]
  }
};

const orderDetails: Record<string, OrderDetail> = orderRows.reduce<Record<string, OrderDetail>>((lookup, order, index) => {
  lookup[order.orderId] = {
    id: order.orderId,
    customer: order.customer,
    date: order.date,
    status: order.status,
    advisor: order.advisor,
    vehicle: order.vehicle,
    total: order.total,
    paymentStatus: order.paymentStatus,
    notes: "Customer approved recommended repair after diagnostic review. Follow-up inspection scheduled for next service interval.",
    lineItems: [
      {
        description: order.service,
        quantity: 1,
        unitPrice: Math.round(order.total * 0.58),
        total: Math.round(order.total * 0.58)
      },
      {
        description: "Labor",
        quantity: 2,
        unitPrice: Math.round(order.total * 0.18),
        total: Math.round(order.total * 0.36)
      },
      {
        description: "Shop supplies & fee",
        quantity: 1,
        unitPrice: Math.round(order.total * 0.06),
        total: Math.round(order.total * 0.06)
      }
    ],
    timeline: [
      { label: "Order opened", timestamp: `${order.date} 08:15` },
      { label: "Vehicle inspection complete", timestamp: `${order.date} 10:40` },
      { label: "Customer approval received", timestamp: `${order.date} 11:05` },
      { label: index % 2 === 0 ? "Payment captured" : "Awaiting final payment", timestamp: `${order.date} 14:20` }
    ]
  };

  return lookup;
}, {});

export const adminMockDatasets = moduleData;
export const adminMockOrderDetails = orderDetails;
