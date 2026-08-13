import { readFileSync } from 'fs';
import { join } from 'path';

describe('transactional security audit event wiring', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/authorization/authorization-administration.service.ts'),
    'utf8',
  );

  it.each([
    'security.role.permissions.replaced',
    'security.user.roles.replaced',
    'security.user.permission_overrides.replaced',
  ])('declara el evento %s', (eventName) => {
    expect(source).toContain(eventName);
  });

  it('escribe tres eventos usando el manager transaccional', () => {
    expect((source.match(/await this\.writeAudit\(manager/g) || []).length).toBe(3);
  });

  it('preserva metadata segura', () => {
    expect(source).toContain('beforeRoleIds');
    expect(source).toContain('afterRoleCodes');
    expect(source).toContain('beforePermissionIds');
    expect(source).toContain('afterPermissionCodes');
    expect(source).toContain('beforeOverrides');
    expect(source).not.toMatch(/audit[\s\S]{0,300}(password|token|signature|key_signing|key_recover)/i);
  });

  it('falla si el servicio de auditoria no esta disponible', () => {
    expect(source).toContain(
      "throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE')",
    );
  });
});
