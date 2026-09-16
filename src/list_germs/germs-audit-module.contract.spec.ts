import { readFileSync } from 'node:fs';
describe('Germs audit module contract', () => {
  const module = readFileSync('src/list_germs/list_germs.module.ts', 'utf8');
  it('provides SecurityAuditService through SecurityAuditModule', () => {
    expect(module).toContain("import { SecurityAuditModule } from '../audit/security-audit.module';");
    expect(module).toContain('AuthorizationModule, SecurityAuditModule');
    expect(module).not.toContain('UsersModule');
  });
});
