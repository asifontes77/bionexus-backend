import { readFileSync } from 'node:fs';
describe('Tax safe status contract', () => {
  const controller = readFileSync('src/tax/tax.controller.ts', 'utf8');
  const service = readFileSync('src/tax/tax.service.ts', 'utf8');
  const migration = readFileSync('src/database/migrations/1787860800000-TaxPermissions.ts', 'utf8');
  it('removes physical deletion and authorizes status independently', () => {
    expect(controller).not.toContain('@Delete');
    expect(controller).not.toContain("@RequirePermissions('tax.delete')");
    expect(controller).toContain("requiredPermissions.push('tax.update')");
    expect(controller).toContain("requiredPermissions.push('tax.change-status')");
    expect(controller).toContain('authorizationService.hasAllPermissions');
    expect(service).not.toContain('repository.remove');
    expect(service).not.toContain('tax.deleted');
    expect(migration).toContain('tax.change-status');
    expect(migration).not.toContain('tax.delete');
  });
});
