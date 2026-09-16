import { readFileSync } from 'node:fs';
describe('Antibiotic audit module contract', () => {
  const module = readFileSync('src/antibiotic/antibiotic.module.ts', 'utf8');
  it('provides SecurityAuditService through SecurityAuditModule', () => {
    expect(module).toContain("import { SecurityAuditModule } from '../audit/security-audit.module';");
    expect(module).toContain('AuthorizationModule, SecurityAuditModule');
  });
});
