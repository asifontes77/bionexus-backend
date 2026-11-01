import { readFileSync, readdirSync } from 'node:fs';

describe('Catalog release foundation contract', () => {
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');

  it('keeps a single baseline migration', () => {
    expect(readdirSync('src/database/migrations').filter(name => name.endsWith('.ts'))).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });

  it('defines immutable platform releases and tenant installations', () => {
    for (const token of ['platform_catalog_releases','laboratory_catalog_packages','snapshot_payload','source_checksum','minimum_schema_version','update_available','customized','deferred']) {
      expect(baseline).toContain(token);
    }
  });

  it('protects release and tenant uniqueness', () => {
    expect(baseline).toContain('UQ_platform_catalog_releases_package_version');
    expect(baseline).toContain('UQ_platform_catalog_releases_one_published');
    expect(baseline).toContain('UQ_laboratory_catalog_packages_scope');
  });
});
