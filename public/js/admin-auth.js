const DEFAULT_ADMIN_TARGET = "/admin";
const ADMIN_ENTRY_PATH = "/lawson-portal";

const normalizeNextUrl = (next) => {
  try {
    const url = new URL(next || DEFAULT_ADMIN_TARGET, window.location.origin);
    return url.toString();
  } catch (error) {
    return new URL(DEFAULT_ADMIN_TARGET, window.location.origin).toString();
  }
};

const getNextUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return normalizeNextUrl(params.get("next"));
};

export const getAdminSession = async () => {
  const response = await fetch("/admin/session", {
    credentials: "same-origin"
  });
  return response.json();
};

export const ensureAdminSession = async () => {
  const session = await getAdminSession();
  return session;
};

export const redirectToAdminLogin = () => {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`${ADMIN_ENTRY_PATH}?next=${next}`);
};

export const redirectAfterLogin = () => {
  window.location.replace(getNextUrl());
};

export const hasAdminPermission = (session, permission) => Boolean(session?.user?.permissions?.includes(permission));
