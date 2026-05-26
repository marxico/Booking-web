import { parseAdminJsonResponse } from "./adminSession";

export interface AdminTeamMember {
  id: number;
  displayName: string;
  email: string;
  role: string;
  authProvider: string;
  status: string;
}

export async function loadAdminUsers(): Promise<AdminTeamMember[]> {
  const response = await fetch("/admin/users", {
    credentials: "same-origin"
  });
  const result = await parseAdminJsonResponse(response, "Could not load admin users.");

  return (result.users || []).map((item: any) => ({
    id: Number(item.id),
    displayName: String(item.displayName || ""),
    email: String(item.email || ""),
    role: String(item.roleLabel || item.role || ""),
    authProvider: String(item.authProvider || ""),
    status: item.isActive ? "Active" : "Inactive"
  }));
}
