import { readFileSync } from 'node:fs';

describe('Tenant catalog package installer contract', () => {
  const service = readFileSync('src/platform/tenant-catalog-package-installer.service.ts', 'utf8');
  const module = readFileSync('src/platform/platform.module.ts', 'utf8');

  it('installs only the six approved packages and twelve shared tables', () => {
    for (const code of ['microbiology','parasitology','samples-and-tax','exam-catalog','financial-and-payments','tariffs']) expect(service).toContain(code);
    expect(service).not.toContain('special_test_lab');
    expect(service).not.toContain('special_test_items');
  });

  it('resolves the latest compatible release in the caller transaction', () => {
    expect(service).toContain('getLatestCompatible(packageCode, this.schemaVersion, manager)');
    expect(service).toContain('FOR UPDATE');
  });

  it('copies by laboratory scope and excludes branch scope', () => {
    expect(service).toContain("column_name NOT IN ('id','laboratory_id','laboratory_branch_id','source_global_id','is_platform_managed')");
    expect(service).toContain('tenant.laboratory_id=$1');
    expect(service).not.toContain('tenant.laboratory_branch_id');
  });

  it('remaps the five approved relations to tenant parents', () => {
    for (const relation of ['group_id','tax_id','currency_id','tariff_id','exam_catalog_id']) expect(service).toContain(relation);
    expect(service).toContain('tenant_parent.source_global_id=(SELECT global_parent.source_global_id');
  });

  it('registers version and checksum only after copying every table', () => {
    expect(service).toContain('INSERT INTO laboratory_catalog_packages');
    expect(service).toContain('release.version');
    expect(service).toContain('release.checksum');
    expect(module).toContain('TenantCatalogPackageInstallerService');
  });
});
