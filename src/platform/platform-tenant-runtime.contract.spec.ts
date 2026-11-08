import { readFileSync } from 'node:fs';
describe('Platform tenant runtime contract', () => {
  const provisioning = readFileSync('src/platform/platform-provisioning.service.ts','utf8');
  const packageCatalog = readFileSync('src/platform/seed-package-catalog.ts','utf8');
  const strategy = readFileSync('src/users/jwt.strategy.ts','utf8');
  const usersController = readFileSync('src/users/users.controller.ts','utf8');
  it('requires a valid laboratory for tenant JWT identities', () => {
    expect(strategy).toContain('const laboratoryId = Number(payload.laboratoryId);');
    expect(strategy).toContain("identityType !== 'platform-owner'");
  });
  it('removes the hardcoded laboratory from user assets', () => {
    expect(usersController).not.toContain('const laboratoryId = 1;');
    expect(usersController).toContain('request.user?.laboratoryId');
  });
  it('validates and installs only selected seed packages', () => {
    expect(provisioning).toContain('resolveGranularSeedPackages(requestedPackages)');
    expect(packageCatalog).toContain('GRANULAR_SEED_PACKAGES');
    expect(provisioning).toContain('tenantPackages.installSelected');
    expect(provisioning).toContain('TenantCatalogPackageInstallerService');
    expect(provisioning).toContain('installedCatalogPackages');
  });
  it('resolves VES inside the new laboratory', () => {
    expect(provisioning).toContain("WHERE laboratory_id=$1 AND upper(btrim(code))=$2 AND is_active=true");
  });
});
