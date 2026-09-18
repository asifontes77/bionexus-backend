import { QueryRunner } from 'typeorm';
import { TariffPermissions1789002000000 } from '../migrations/1789002000000-TariffPermissions';

describe('TariffPermissions1789002000000', () => {
  it('registra cinco permisos idempotentes y los asigna al admin activo', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new TariffPermissions1789002000000().up({
      query,
    } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    for (const code of [
      'tariffs.read',
      'tariffs.create',
      'tariffs.update',
    ])
      expect(sql).toContain(code);
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(sql).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(sql).toContain("role.code='admin'");
    expect(sql).toContain('role.is_active=1');
  });

  it('revierte asignaciones antes del catalogo', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new TariffPermissions1789002000000().down({
      query,
    } as unknown as QueryRunner);
    expect(String(query.mock.calls[0][0])).toContain('DELETE assignment');
    expect(String(query.mock.calls[1][0])).toContain(
      'DELETE FROM security_permissions',
    );
  });
});
