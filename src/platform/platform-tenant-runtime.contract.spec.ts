import { readFileSync } from 'node:fs';
describe('Platform tenant runtime contract', () => {
  const provisioning = readFileSync('src/platform/platform-provisioning.service.ts','utf8');
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
    expect(provisioning).toContain('SEED_PACKAGE_KEYS');
    expect(provisioning).toContain('installSeedPackages');
    expect(provisioning).toContain('laboratory_seed_package_tables');
    expect(provisioning).toContain('install_laboratory_seed_table');
  });
  it('resolves VES inside the new laboratory', () => {
    expect(provisioning).toContain("WHERE laboratory_id=$1 AND upper(btrim(code))='VES'");
  });
});
