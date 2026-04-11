import { admin } from '../config/appConfig';
import { all, get, run } from '../db';
import { hashPassword, verifyPassword } from './adminSecurity';
import type {
  AdminPermission,
  AdminRole,
  AdminSessionUser,
  AdminUser,
  AdminUserRow
} from '../types';

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'appointments.read',
    'appointments.write',
    'history.read',
    'pricing.read',
    'pricing.write',
    'analytics.read',
    'users.read',
    'users.write'
  ],
  manager: [
    'appointments.read',
    'appointments.write',
    'history.read',
    'pricing.read',
    'pricing.write',
    'analytics.read'
  ],
  analyst: [
    'appointments.read',
    'history.read',
    'pricing.read',
    'analytics.read'
  ],
  viewer: [
    'appointments.read',
    'history.read',
    'pricing.read'
  ]
};

const toAdminUser = (row: AdminUserRow): AdminUser => ({
  id: row.id,
  username: row.username,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  authProvider: row.auth_provider,
  googleSubject: row.google_subject,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastLoginAt: row.last_login_at
});

const getRolePermissions = (role: AdminRole): AdminPermission[] => rolePermissions[role] || [];

const buildSessionUser = (user: AdminUser): AdminSessionUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  permissions: getRolePermissions(user.role)
});

const getAdminUserById = async (id: number): Promise<AdminUser | null> => {
  const row = await get<AdminUserRow>('SELECT * FROM admin_users WHERE id = ?', [id]);
  return row ? toAdminUser(row) : null;
};

const getAdminUserByIdentifier = async (identifier: string): Promise<AdminUserRow | null> => {
  const normalized = String(identifier || '').trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const row = await get<AdminUserRow>(
    `SELECT * FROM admin_users
     WHERE lower(email) = ? OR lower(username) = ?
     LIMIT 1`,
    [normalized, normalized]
  );

  return row || null;
};

const getAdminUserByGoogleIdentity = async (email: string, googleSubject: string): Promise<AdminUserRow | null> => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedSubject = String(googleSubject || '').trim();

  if (!normalizedEmail || !normalizedSubject) {
    return null;
  }

  const row = await get<AdminUserRow>(
    `SELECT * FROM admin_users
     WHERE lower(email) = ?
        OR google_subject = ?
     LIMIT 1`,
    [normalizedEmail, normalizedSubject]
  );

  return row || null;
};

const authenticateAdminUser = async (identifier: string, password: string): Promise<AdminUser | null> => {
  const row = await getAdminUserByIdentifier(identifier);

  if (!row || !row.is_active) {
    return null;
  }

  if (row.auth_provider === 'google') {
    return null;
  }

  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }

  return toAdminUser(row);
};

const authenticateGoogleAdminUser = async (
  email: string,
  googleSubject: string
): Promise<AdminUser | null> => {
  const row = await getAdminUserByGoogleIdentity(email, googleSubject);

  if (!row || !row.is_active) {
    return null;
  }

  if (row.auth_provider === 'password') {
    return null;
  }

  if (row.google_subject && row.google_subject !== googleSubject) {
    return null;
  }

  if (!row.google_subject) {
    await run(
      'UPDATE admin_users SET google_subject = ?, updated_at = ? WHERE id = ?',
      [googleSubject, new Date().toISOString(), row.id]
    );
  }

  const updatedUser = await getAdminUserById(row.id);
  return updatedUser;
};

const recordAdminLogin = async (userId: number): Promise<void> => {
  await run('UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?', [
    new Date().toISOString(),
    new Date().toISOString(),
    userId
  ]);
};

const listAdminUsers = async (): Promise<AdminUser[]> => {
  const rows = await all<AdminUserRow>('SELECT * FROM admin_users ORDER BY display_name ASC');
  return rows.map(toAdminUser);
};

const createAdminUser = async ({
  username,
  email,
  displayName,
  password,
  role,
  authProvider
}: {
  username: string;
  email: string;
  displayName: string;
  password: string;
  role: AdminRole;
  authProvider: 'password' | 'google' | 'hybrid';
}): Promise<AdminUser> => {
  const now = new Date().toISOString();
  const result = await run(
    `INSERT INTO admin_users
     (username, email, display_name, password_hash, role, auth_provider, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      username,
      email.toLowerCase(),
      displayName,
      authProvider === 'google' ? null : hashPassword(password),
      role,
      authProvider,
      now,
      now
    ]
  );

  const user = await getAdminUserById(result.lastID);

  if (!user) {
    throw new Error('Could not load the new admin user.');
  }

  return user;
};

const countActiveSuperAdmins = async (): Promise<number> => {
  const row = await get<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM admin_users
     WHERE role = 'super_admin' AND is_active = 1`
  );

  return row?.count || 0;
};

const updateAdminUser = async (
  id: number,
  updates: Partial<{
    displayName: string;
    role: AdminRole;
    isActive: boolean;
    password: string;
    authProvider: 'password' | 'google' | 'hybrid';
  }>
): Promise<AdminUser | null> => {
  const existing = await get<AdminUserRow>('SELECT * FROM admin_users WHERE id = ?', [id]);

  if (!existing) {
    return null;
  }

  const nextRole = updates.role || existing.role;
  const nextIsActive = typeof updates.isActive === 'boolean' ? updates.isActive : Boolean(existing.is_active);

  if (existing.role === 'super_admin' && (!nextIsActive || nextRole !== 'super_admin')) {
    const activeSuperAdmins = await countActiveSuperAdmins();

    if (activeSuperAdmins <= 1) {
      throw new Error('Keep at least one active super admin on the team.');
    }
  }

  const authProvider = updates.authProvider || existing.auth_provider;
  const passwordHash = updates.password
    ? hashPassword(updates.password)
    : existing.password_hash;

  const nextPasswordHash = authProvider === 'google' && !updates.password ? null : passwordHash;

  await run(
    `UPDATE admin_users
     SET display_name = ?, role = ?, is_active = ?, password_hash = ?, auth_provider = ?, updated_at = ?
     WHERE id = ?`,
    [
      updates.displayName || existing.display_name,
      nextRole,
      nextIsActive ? 1 : 0,
      nextPasswordHash,
      authProvider,
      new Date().toISOString(),
      id
    ]
  );

  return getAdminUserById(id);
};

const seedAdminUser = async ({
  username,
  email,
  displayName,
  password,
  role,
  authProvider,
  googleSubject,
  isActive = 1
}: {
  username: string;
  email: string;
  displayName: string;
  password: string;
  role: AdminRole;
  authProvider: 'password' | 'google' | 'hybrid';
  googleSubject?: string;
  isActive?: number;
}): Promise<void> => {
  const existing = await get<AdminUserRow>(
    'SELECT id FROM admin_users WHERE lower(email) = ? OR lower(username) = ? LIMIT 1',
    [email.toLowerCase(), username.toLowerCase()]
  );

  if (existing) {
    return;
  }

  const now = new Date().toISOString();

  await run(
    `INSERT INTO admin_users
     (username, email, display_name, password_hash, role, auth_provider, google_subject, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username,
      email.toLowerCase(),
      displayName,
      authProvider === 'google' ? null : hashPassword(password),
      role,
      authProvider,
      googleSubject || null,
      isActive,
      now,
      now
    ]
  );
};

const canUseGoogleLogin = (): boolean => Boolean(admin.googleClientId);

export {
  authenticateAdminUser,
  authenticateGoogleAdminUser,
  buildSessionUser,
  canUseGoogleLogin,
  createAdminUser,
  getAdminUserById,
  getRolePermissions,
  listAdminUsers,
  recordAdminLogin,
  rolePermissions,
  seedAdminUser,
  updateAdminUser
};
