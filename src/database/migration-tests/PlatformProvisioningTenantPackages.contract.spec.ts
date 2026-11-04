import { readFileSync } from 'node:fs';

describe('Platform provisioning tenant packages contract', () => {
  const provisioning = readFileSync('src/platform/platform-provisioning.service.ts', 'utf8');

  it('injects and invokes the tenant package installer exactly once', () => {
    expect(provisioning).toContain('private readonly tenantPackages: TenantCatalogPackageInstallerService');
    expect((provisioning.match(/tenantPackages\.installSelected\(/g) ?? []).length).toBe(1);
  });

  it('keeps package installation inside the existing provisioning transaction', () => {
    const transaction = provisioning.indexOf('this.dataSource.transaction');
    const installation = provisioning.indexOf('tenantPackages.installSelected(', transaction);
    expect(transaction).toBeGreaterThanOrEqual(0);
    expect(installation).toBeGreaterThan(transaction);
  });

  it('removes the legacy template-copy method', () => {
    expect(provisioning).not.toContain('private async installSeedPackages(');
    expect(provisioning).not.toContain('WHERE template.laboratory_id IS NULL');
  });

  it('preserves the mandatory main branch and returns installed package evidence', () => {
    expect(provisioning).toContain('INSERT INTO laboratory_branches');
    expect(provisioning).toContain('mainBranch:branch');
    expect(provisioning).toContain('installedCatalogPackages');
  });

  it('requires an active tenant-scoped VES currency before creating application settings', () => {
    const currencyLookup = provisioning.indexOf("WHERE laboratory_id=$1 AND upper(btrim(code))='VES' AND is_active=true");
    const settingsInsert = provisioning.indexOf('INSERT INTO application_settings');
    expect(currencyLookup).toBeGreaterThanOrEqual(0);
    expect(settingsInsert).toBeGreaterThan(currencyLookup);
  });
});
