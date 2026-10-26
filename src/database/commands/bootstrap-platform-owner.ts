import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source';
import { validatePassword } from './bootstrap-first-admin';

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
};

export async function bootstrapPlatformOwner(dataSource: DataSource = AppDataSource): Promise<void> {
  const username = required('BIONEXUS_OWNER_USERNAME').toLowerCase();
  const password = required('BIONEXUS_OWNER_PASSWORD');
  const name = required('BIONEXUS_OWNER_NAME');
  const email = process.env.BIONEXUS_OWNER_EMAIL?.trim().toLowerCase() || null;
  if (!/^[A-Za-z0-9._-]+$/.test(username)) throw new Error('OWNER_USERNAME_INVALID');
  if (username.length > 100 || name.length > 100 || (email?.length ?? 0) > 150) throw new Error('OWNER_FIELD_TOO_LONG');
  validatePassword(password);
  await dataSource.transaction('SERIALIZABLE', async manager => {
    await manager.query("SELECT pg_advisory_xact_lock(hashtext('bio-nexus.platform-owner-bootstrap'))");
    const rows = await manager.query('SELECT COUNT(*) AS total FROM platform_owners');
    if (Number(rows[0]?.total ?? 0) !== 0) throw new Error('PLATFORM_OWNER_ALREADY_EXISTS');
    const hash = await bcrypt.hash(password, 8);
    await manager.query('INSERT INTO platform_owners (username,password_hash,name,email,is_active) VALUES ($1,$2,$3,$4,true)', [username, hash, name, email]);
  });
}

if (require.main === module) {
  AppDataSource.initialize()
    .then(() => bootstrapPlatformOwner())
    .then(() => process.stdout.write('Propietario global creado correctamente.\n'))
    .finally(async () => {
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
    });
}
