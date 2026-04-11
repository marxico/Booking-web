import { adminMockDatasets, adminMockOrderDetails } from "../data/mock/adminMockData";
import type { AdminModuleDataset, AdminModuleKey, OrderDetail } from "../types/admin";

const simulateNetworkDelay = (duration = 260) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

export async function fetchAdminModuleDataset(moduleKey: AdminModuleKey): Promise<AdminModuleDataset> {
  await simulateNetworkDelay();

  const dataset = adminMockDatasets[moduleKey];

  if (!dataset) {
    throw new Error("The requested admin module is not available.");
  }

  return dataset;
}

export async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  await simulateNetworkDelay(220);

  const detail = adminMockOrderDetails[orderId];

  if (!detail) {
    throw new Error("Order detail could not be found.");
  }

  return detail;
}
