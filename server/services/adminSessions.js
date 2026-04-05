const crypto = require('crypto');

const { admin } = require('../config/appConfig');

const sessions = new Map();

const parseCookies = (cookieHeader = '') => cookieHeader
  .split(';')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .reduce((cookies, entry) => {
    const separatorIndex = entry.indexOf('=');

    if (separatorIndex === -1) {
      return cookies;
    }

    const key = entry.slice(0, separatorIndex);
    const value = decodeURIComponent(entry.slice(separatorIndex + 1));
    cookies[key] = value;
    return cookies;
  }, {});

const clearExpiredSessions = () => {
  const now = Date.now();

  sessions.forEach((session, token) => {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  });
};

const createAdminSession = () => {
  const token = crypto.randomBytes(24).toString('hex');

  sessions.set(token, {
    expiresAt: Date.now() + admin.sessionDurationMs
  });

  return token;
};

const getValidSessionToken = (req) => {
  clearExpiredSessions();
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[admin.sessionCookieName];

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return token;
};

const setSessionCookie = (res, token) => {
  res.setHeader(
    'Set-Cookie',
    `${admin.sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${admin.sessionDurationMs / 1000}`
  );
};

const clearSessionCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    `${admin.sessionCookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
};

const deleteSession = (token) => {
  sessions.delete(token);
};

module.exports = {
  createAdminSession,
  getValidSessionToken,
  setSessionCookie,
  clearSessionCookie,
  deleteSession
};
