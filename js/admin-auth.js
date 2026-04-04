const DEFAULT_ADMIN_TARGET = "/admin.html";

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

export const ensureAdminSession = async () => {
  const response = await fetch("/admin/session", {
    credentials: "same-origin"
  });
  const result = await response.json();
  return Boolean(result.authenticated);
};

export const redirectToAdminLogin = () => {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/admin-login.html?next=${next}`);
};

export const redirectAfterLogin = () => {
  window.location.replace(getNextUrl());
};
