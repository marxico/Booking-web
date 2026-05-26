import type { AdminModuleDataset, AdminModuleKey, OrderDetail } from "../types/admin";

export async function fetchAdminModuleDataset(_moduleKey: AdminModuleKey): Promise<AdminModuleDataset> {
  throw new Error("This production report needs a real data source before it can be shown.");
}

export async function fetchOrderDetail(_orderId: string): Promise<OrderDetail> {
  throw new Error("Order details need a real production data source before they can be shown.");
}
