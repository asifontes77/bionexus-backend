import { readFileSync } from 'node:fs';

describe('Catalog package schema contract', () => {
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');

  it('defines laboratory_catalog_packages exactly once', () => {
    expect((baseline.match(/CREATE TABLE "laboratory_catalog_packages"/g) ?? []).length).toBe(1);
  });

  it('keeps the versioned package-installation contract', () => {
    for (const token of [
      'catalog_release_id',
      'installed_version',
      'source_checksum',
      'installation_status',
      'UQ_laboratory_catalog_packages_scope',
    ]) expect(baseline).toContain(token);
  });

  it('does not restore the obsolete package_key table contract', () => {
    expect(baseline).not.toContain('"package_key" varchar(80) NOT NULL');
    expect(baseline).not.toContain('IX_laboratory_catalog_packages_active');
  });
});
