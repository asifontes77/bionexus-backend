import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

describe('Security role name uniqueness in the single baseline', () => {
  const service = readFileSync('src/authorization/authorization-administration.service.ts', 'utf8');
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  const payload = baseline.match(/const BASELINE_GZIP_BASE64 = '([^']+)';/)?.[1];
  const sql = payload ? gunzipSync(Buffer.from(payload, 'base64')).toString('utf8') : '';

  it('validates normalized names on create and update', () => {
    expect(service).toContain('ensureRoleNameAvailable');
    expect(service).toContain('repository.findOne');
    expect(service).toContain('LOWER(TRIM(${alias})) = :normalizedName');
    expect(service).toContain('existingRole.id !== excludedId');
    expect(service).toContain('ROLE_NAME_ALREADY_EXISTS');
  });

  it('maps concurrent duplicate errors', () => {
    expect(service).toContain('ER_DUP_ENTRY');
    expect(service).toContain('1062');
    expect(service).toContain('UX_security_roles_name_normalized');
  });

  it('keeps the physical protection inside the only baseline migration', () => {
    expect(payload).toBeDefined();
    expect(sql).toContain('`name_normalized` varchar(100)');
    expect(sql).toContain('GENERATED ALWAYS AS (lower(trim(`name`))) STORED');
    expect(sql).toContain('UX_security_roles_name_normalized');
    const migrations = readdirSync('src/database/migrations').filter((name) => name.endsWith('.ts'));
    expect(migrations).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });
});
