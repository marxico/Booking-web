import crypto from 'node:crypto';
import type { Request, Response } from 'express';

import { admin } from '../config/appConfig';
import type { AdminSessionUser } from '../types';

interface SessionRecord {
  expiresAt: number;
  user: AdminSessionUser;
}

const sessions = new Map<string, SessionRecord>();

const parseCookies = (cookieHeader = ''): Record<string, string> => cookieHeader
  .split(';')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .reduce<Record<string, string>>((cookies, entry) => {
    const separatorIndex = entry.indexOf('=');

    if (separatorIndex === -1) {
      return cookies;
    }

    const key = entry.slice(0, separatorIndex);
    const value = decodeURIComponent(entry.slice(separatorIndex + 1));
    cookies[key] = value;
    return cookies;
  }, {});

const clearExpiredSessions = (): void => {
  const now = Date.now();

  sessions.forEach((session, token) => {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  });
};

const createAdminSession = (user: AdminSessionUser): string => {
  const token = crypto.randomUUID();

  sessions.set(token, {
    expiresAt: Date.now() + admin.sessionDurationMs,
    user
  });

  return token;
};

const getValidSessionToken = (req: Request): string | null => {
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

const getSessionUser = (req: Request): AdminSessionUser | null => {
  const token = getValidSessionToken(req);

  if (!token) {
    return null;
  }

  return sessions.get(token)?.user || null;
};

const isSecureRequest = (req: Request): boolean => req.secure || req.get('x-forwarded-proto') === 'https';

const setSessionCookie = (req: Request, res: Response, token: string): void => {
  const secureFlag = isSecureRequest(req) ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `${admin.sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${admin.sessionDurationMs / 1000}${secureFlag}`
  );
};

const clearSessionCookie = (res: Response): void => {
  res.setHeader(
    'Set-Cookie',
    `${admin.sessionCookieName}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`
  );
};

const deleteSession = (token: string): void => {
  sessions.delete(token);
};

export {
  createAdminSession,
  getValidSessionToken,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  deleteSession
};
