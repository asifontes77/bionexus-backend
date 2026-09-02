import { QueryRunner } from 'typeorm';
import { RoutinesPermissions1788312600000 } from '../migrations/1788312600000-RoutinesPermissions';

describe('RoutinesPermissions1788312600000', () => {
  let query: jest.Mock;
  let runner: QueryRunner;
  beforeEach(() => { query = jest.fn().mockResolvedValue(undefined); runner = { query } as unknown as QueryRunner; });
  it('registra cuatro permisos idempotentes y los asigna al admin activo', async () => {
    await new RoutinesPermissions1788312600000().up(runner);
    expect(query).toHaveBeenCalledTimes(2);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    for (const code of ['routines.read', 'routines.create', 'routines.update', 'routines.delete']) expect(sql).toContain(code);
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(sql).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(sql).toContain("role.code = 'admin'");
    expect(sql).toContain('role.is_active = 1');
  });
  it('revierte asignaciones antes del catalogo', async () => {
    await new RoutinesPermissions1788312600000().down(runner);
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[0][0])).toContain('DELETE assignment');
    expect(String(query.mock.calls[1][0])).toContain('DELETE FROM security_permissions');
  });
});
