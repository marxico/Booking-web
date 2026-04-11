import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "./components/admin/AdminLayout";
import { BookingHomePage } from "./pages/BookingHomePage";
import { CustomerAgingPage } from "./pages/admin/CustomerAgingPage";
import { CustomerPage } from "./pages/admin/CustomerPage";
import { OperationsAnalyticsPage } from "./pages/admin/OperationsAnalyticsPage";
import { OperationsCalendarPage } from "./pages/admin/OperationsCalendarPage";
import { OperationsHistoryPage } from "./pages/admin/OperationsHistoryPage";
import { OperationsOverviewPage } from "./pages/admin/OperationsOverviewPage";
import { OperationsPricingPage } from "./pages/admin/OperationsPricingPage";
import { OperationsRequestsPage } from "./pages/admin/OperationsRequestsPage";
import { OperationsTeamPage } from "./pages/admin/OperationsTeamPage";
import { DeferredServicesReportPage } from "./pages/admin/DeferredServicesReportPage";
import { DiscountPage } from "./pages/admin/DiscountPage";
import { FeePage } from "./pages/admin/FeePage";
import { InventoryActivityPage } from "./pages/admin/InventoryActivityPage";
import { InventoryLevelPage } from "./pages/admin/InventoryLevelPage";
import { ItemsSoldPage } from "./pages/admin/ItemsSoldPage";
import { LaborPage } from "./pages/admin/LaborPage";
import { OrderDetailPage } from "./pages/admin/OrderDetailPage";
import { OrdersPage } from "./pages/admin/OrdersPage";
import { OutstandingInvoicesPage } from "./pages/admin/OutstandingInvoicesPage";
import { ProfitabilityPage } from "./pages/admin/ProfitabilityPage";
import { SalesByServiceWriterPage } from "./pages/admin/SalesByServiceWriterPage";
import { SalesPage } from "./pages/admin/SalesPage";
import { ServicesInvoicedPage } from "./pages/admin/ServicesInvoicedPage";
import { UnusedInventoryPage } from "./pages/admin/UnusedInventoryPage";
import "./admin.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookingHomePage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="operations/overview" replace />} />
          <Route path="operations/overview" element={<OperationsOverviewPage />} />
          <Route path="operations/requests" element={<OperationsRequestsPage />} />
          <Route path="operations/calendar" element={<OperationsCalendarPage />} />
          <Route path="operations/analytics" element={<OperationsAnalyticsPage />} />
          <Route path="operations/pricing" element={<OperationsPricingPage />} />
          <Route path="operations/history" element={<OperationsHistoryPage />} />
          <Route path="operations/team" element={<OperationsTeamPage />} />
          <Route path="performance/sales" element={<SalesPage />} />
          <Route path="performance/profitability" element={<ProfitabilityPage />} />
          <Route path="performance/services-invoiced" element={<ServicesInvoicedPage />} />
          <Route path="performance/customer" element={<CustomerPage />} />
          <Route path="performance/labor" element={<LaborPage />} />
          <Route path="performance/items-sold" element={<ItemsSoldPage />} />
          <Route path="performance/fee" element={<FeePage />} />
          <Route path="performance/discount" element={<DiscountPage />} />
          <Route path="performance/sales-by-service-writer" element={<SalesByServiceWriterPage />} />
          <Route path="order-invoice/orders" element={<OrdersPage />} />
          <Route path="order-invoice/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="order-invoice/outstanding-invoices" element={<OutstandingInvoicesPage />} />
          <Route path="order-invoice/customer-aging" element={<CustomerAgingPage />} />
          <Route path="order-invoice/deferred-services-report" element={<DeferredServicesReportPage />} />
          <Route path="inventory-management/inventory-activity" element={<InventoryActivityPage />} />
          <Route path="inventory-management/inventory-level" element={<InventoryLevelPage />} />
          <Route path="inventory-management/unused-inventory" element={<UnusedInventoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
