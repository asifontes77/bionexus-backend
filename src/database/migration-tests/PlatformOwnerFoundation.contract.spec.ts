import { readFileSync } from 'fs';
describe('Platform owner foundation contract', () => {
  const migration = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
  const bootstrap = readFileSync('src/database/commands/bootstrap-platform-owner.ts','utf8');
  it('keeps platform owners physically separated from tenant users', () => {
    expect(migration).toContain('CREATE TABLE "platform_owners"');
    expect(migration).toContain('UQ_platform_owners_username_normalized');
    expect(migration).not.toContain('INSERT INTO "platform_owners"');
  });
  it('protects bootstrap with serializable transaction and lock', () => {
    expect(bootstrap).toContain("transaction('SERIALIZABLE'");
    expect(bootstrap).toContain('pg_advisory_xact_lock');
    expect(bootstrap).toContain('PLATFORM_OWNER_ALREADY_EXISTS');
  });
  it('does not log credentials or hashes', () => {
    expect(bootstrap).not.toMatch(/console\.log|password_hash.*write|process\.stdout.*password/i);
  });
});
