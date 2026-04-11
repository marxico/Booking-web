const ADMIN_ENTRY_PATH = "/lawson-portal";

export interface AdminSessionResponse {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    displayName: string;
    role: string;
    permissions: string[];
  } | null;
}

export async function loadAdminSession(): Promise<AdminSessionResponse> {
  const response = await fetch("/admin/session", {
    credentials: "same-origin"
  });

  return response.json();
}

export function redirectToAdminLogin(nextPath?: string) {
  const next = encodeURIComponent(nextPath || `${window.location.pathname}${window.location.search}`);
  window.location.replace(`${ADMIN_ENTRY_PATH}?next=${next}`);
}

export async function parseAdminJsonResponse(response: Response, fallbackMessage: string) {
  const result = await response.json();

  if (response.status === 401) {
    redirectToAdminLogin();
    throw new Error("Your admin session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(result.error || fallbackMessage);
  }

  return result;
}
