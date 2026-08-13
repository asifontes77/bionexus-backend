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

  it('mantiene los tres eventos de asignaciones dentro de transacciones', () => {
    const assignmentEvents = [
      'security.role.permissions.replaced',
      'security.user.roles.replaced',
      'security.user.permission_overrides.replaced',
    ];

    for (const eventName of assignmentEvents) {
      const eventIndex = source.indexOf(eventName);
      expect(eventIndex).toBeGreaterThan(-1);
      const transactionIndex = source.lastIndexOf(
        'this.dataSource.transaction',
        eventIndex,
      );
      const writeIndex = source.lastIndexOf(
        'await this.writeAudit(manager',
        eventIndex,
      );
      expect(transactionIndex).toBeGreaterThan(-1);
      expect(writeIndex).toBeGreaterThan(transactionIndex);
    }
  });

  it('permite acumular nuevos eventos sin invalidar este contrato', () => {
    const totalWrites = (
      source.match(/await this\.writeAudit\(manager/g) || []
    ).length;
    expect(totalWrites).toBeGreaterThanOrEqual(3);
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
