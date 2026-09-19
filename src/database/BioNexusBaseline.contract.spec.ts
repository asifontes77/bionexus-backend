import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

function baselineSql(): string {
  const migration = readFileSync(
    'src/database/migrations/1790366400000-BioNexusBaseline.ts',
    'utf8',
  );
  const match = migration.match(/const BASELINE_GZIP_BASE64 = '([^']+)';/);
  if (!match) throw new Error('BIONEXUS_BASELINE_PAYLOAD_NOT_FOUND');
  return gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
}

describe('BioNexusBaseline migration contract', () => {
  const migration = readFileSync(
    'src/database/migrations/1790366400000-BioNexusBaseline.ts',
    'utf8',
  );
  const sql = baselineSql();

  it('mantiene una unica migracion inicial protegida', () => {
    expect(migration).toContain('BioNexusBaseline1790366400000');
    expect(migration).toContain('BIONEXUS_BASELINE_REQUIRES_EMPTY_DATABASE');
    expect(migration).toContain('BIONEXUS_BASELINE_DOWN_NOT_AVAILABLE');
    expect(sql).toContain('CREATE TABLE `users`');
    expect(sql).toContain('INSERT INTO `security_permissions`');
  });
});