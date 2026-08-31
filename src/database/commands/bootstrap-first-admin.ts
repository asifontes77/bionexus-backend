import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import AppDataSource from '../data-source';

export interface FirstAdminEnvironment {
  BIO_NEXUS_ADMIN_USERNAME?: string;
  BIO_NEXUS_ADMIN_PASSWORD?: string;
  BIO_NEXUS_ADMIN_NAME?: string;
  BIO_NEXUS_ADMIN_TELEPHONE?: string;
  BIO_NEXUS_ADMIN_EMAIL?: string;
}

export interface FirstAdminInput {
  username: string;
  password: string;
  name: string;
  telephone: string;
  email: string | null;
}

export interface FirstAdminResult {
  userId: number;
  username: string;
}

type CountRow = { total: string | number };
type IdRow = { id: string | number };

const requiredMigrations = [
  'InitialSchema1785801600000',
  'AuthorizationFoundation1786060800000',
  'ExamCatalogRelations1786406400000',
];

export function resolveFirstAdminInput(
  environment: FirstAdminEnvironment,
): FirstAdminInput {
  const username = normalizeRequired(
    environment.BIO_NEXUS_ADMIN_USERNAME,
    'BIO_NEXUS_ADMIN_USERNAME',
  );
  const password = normalizeRequired(
    environment.BIO_NEXUS_ADMIN_PASSWORD,
    'BIO_NEXUS_ADMIN_PASSWORD',
    false,
  );
  const name = normalizeRequired(
    environment.BIO_NEXUS_ADMIN_NAME,
    'BIO_NEXUS_ADMIN_NAME',
  );
  const telephone = normalizeRequired(
    environment.BIO_NEXUS_ADMIN_TELEPHONE,
    'BIO_NEXUS_ADMIN_TELEPHONE',
  );
  const emailValue = environment.BIO_NEXUS_ADMIN_EMAIL?.trim() ?? '';

  if (username.length > 100) throw new Error('BIO_NEXUS_ADMIN_USERNAME_TOO_LONG');
  if (!/^[A-Za-z0-9._-]+$/.test(username))
    throw new Error('BIO_NEXUS_ADMIN_USERNAME_INVALID');
  if (name.length > 100) throw new Error('BIO_NEXUS_ADMIN_NAME_TOO_LONG');
  if (telephone.length > 20) throw new Error('BIO_NEXUS_ADMIN_TELEPHONE_TOO_LONG');
  if (emailValue.length > 100) throw new Error('BIO_NEXUS_ADMIN_EMAIL_TOO_LONG');
  if (emailValue !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    throw new Error('BIO_NEXUS_ADMIN_EMAIL_INVALID');
  }
  validatePassword(password);

  return {
    username,
    password,
    name,
    telephone,
    email: emailValue === '' ? null : emailValue.toLowerCase(),
  };
}

export async function bootstrapFirstAdministrator(
  dataSource: DataSource,
  input: FirstAdminInput,
): Promise<FirstAdminResult> {
  if (!dataSource.isInitialized) throw new Error('DATA_SOURCE_NOT_INITIALIZED');

  return dataSource.transaction(async (manager) => {
    await assertMigrationsApplied(manager);
    await assertNoActiveAdministrator(manager);
    await assertUserDoesNotExist(manager, input);

    const roleRows = (await manager.query(`
      SELECT id
      FROM security_roles
      WHERE code = 'admin'
        AND is_active = 1
      LIMIT 1
      FOR UPDATE
    `)) as IdRow[];
    const roleId = Number(roleRows[0]?.id ?? 0);
    if (!Number.isInteger(roleId) || roleId <= 0)
      throw new Error('ACTIVE_ADMIN_ROLE_NOT_FOUND');

    const passwordHash = await bcrypt.hash(input.password, 8);
    const insertResult = await manager.query(
      `INSERT INTO users (
        password, name, user_name, telephone, email, roles,
        request_password, hide_user
      ) VALUES (?, ?, ?, ?, ?, 'admin', 0, 0)`,
      [passwordHash, input.name, input.username, input.telephone, input.email],
    );
    const userId = Number(insertResult?.insertId ?? 0);
    if (!Number.isInteger(userId) || userId <= 0)
      throw new Error('ADMIN_USER_CREATION_FAILED');

    await manager.query(
      `INSERT INTO security_user_roles (user_id, role_id) VALUES (?, ?)`,
      [userId, roleId],
    );

    const assignmentRows = (await manager.query(
      `SELECT COUNT(*) AS total
       FROM security_user_roles user_role
       INNER JOIN security_roles role ON role.id = user_role.role_id
       INNER JOIN users user ON user.id = user_role.user_id
       WHERE user_role.user_id = ?
         AND role.code = 'admin'
         AND role.is_active = 1
         AND user.hide_user = 0`,
      [userId],
    )) as CountRow[];
    if (Number(assignmentRows[0]?.total ?? 0) !== 1) {
      throw new Error('ADMIN_ROLE_ASSIGNMENT_FAILED');
    }

    return { userId, username: input.username };
  });
}

async function assertMigrationsApplied(manager: EntityManager): Promise<void> {
  const rows = (await manager.query(
    `SELECT name FROM migrations WHERE name IN (?, ?, ?)`,
    requiredMigrations,
  )) as Array<{ name: string }>;
  const names = new Set(rows.map((row) => row.name));
  const missing = requiredMigrations.filter((name) => !names.has(name));
  if (missing.length > 0)
    throw new Error(`REQUIRED_MIGRATIONS_MISSING:${missing.join(',')}`);
}

async function assertNoActiveAdministrator(
  manager: EntityManager,
): Promise<void> {
  const rows = (await manager.query(`
    SELECT COUNT(DISTINCT user_role.user_id) AS total
    FROM security_user_roles user_role
    INNER JOIN security_roles role ON role.id = user_role.role_id
    INNER JOIN users user ON user.id = user_role.user_id
    WHERE role.code = 'admin'
      AND role.is_active = 1
      AND user.hide_user = 0
  `)) as CountRow[];
  if (Number(rows[0]?.total ?? 0) > 0)
    throw new Error('ACTIVE_ADMINISTRATOR_ALREADY_EXISTS');
}

async function assertUserDoesNotExist(
  manager: EntityManager,
  input: FirstAdminInput,
): Promise<void> {
  const rows = (await manager.query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE user_name = ?
        OR (? IS NOT NULL AND email = ?)`,
    [input.username, input.email, input.email],
  )) as CountRow[];
  if (Number(rows[0]?.total ?? 0) > 0)
    throw new Error('ADMIN_IDENTITY_ALREADY_EXISTS');
}

function normalizeRequired(
  value: string | undefined,
  name: string,
  trim = true,
): string {
  if (value === undefined || value === null)
    throw new Error(`${name}_REQUIRED`);
  const normalized = trim ? value.trim() : value;
  if (normalized === '') throw new Error(`${name}_REQUIRED`);
  return normalized;
}

function validatePassword(password: string): void {
  if (password.length < 12) throw new Error('BIO_NEXUS_ADMIN_PASSWORD_TOO_SHORT');
  if (password.length > 200) throw new Error('BIO_NEXUS_ADMIN_PASSWORD_TOO_LONG');
  if (!/[a-z]/.test(password))
    throw new Error('BIO_NEXUS_ADMIN_PASSWORD_REQUIRES_LOWERCASE');
  if (!/[A-Z]/.test(password))
    throw new Error('BIO_NEXUS_ADMIN_PASSWORD_REQUIRES_UPPERCASE');
  if (!/[0-9]/.test(password))
    throw new Error('BIO_NEXUS_ADMIN_PASSWORD_REQUIRES_NUMBER');
  if (!/[^A-Za-z0-9]/.test(password))
    throw new Error('BIO_NEXUS_ADMIN_PASSWORD_REQUIRES_SYMBOL');
}

async function main(): Promise<void> {
  const input = resolveFirstAdminInput(process.env);
  await AppDataSource.initialize();
  try {
    const result = await bootstrapFirstAdministrator(AppDataSource, input);
    process.stdout.write(JSON.stringify({ success: true, ...result }) + '\n');
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'FIRST_ADMIN_BOOTSTRAP_FAILED';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
