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
});
