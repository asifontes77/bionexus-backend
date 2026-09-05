import { QueryRunner } from 'typeorm';
import { SpecialTestsPermissions1788573600000 } from '../migrations/1788573600000-SpecialTestsPermissions';
describe('SpecialTestsPermissions1788573600000', () => {
  it('registra ocho permisos y los asigna al admin activo', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new SpecialTestsPermissions1788573600000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    expect(query).toHaveBeenCalledTimes(2);
    for (const code of ['special-tests.read','special-tests.create','special-tests.update','special-tests.change-status','special-test-items.read','special-test-items.create','special-test-items.update','special-test-items.delete']) expect(sql).toContain(code);
    expect(sql).toContain("role.code='admin'");
    expect(sql).toContain('role.is_active=1');
  });
  it('revierte asignaciones antes del catalogo', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new SpecialTestsPermissions1788573600000().down({ query } as unknown as QueryRunner);
    expect(String(query.mock.calls[0][0])).toContain('DELETE assignment');
    expect(String(query.mock.calls[1][0])).toContain('DELETE FROM security_permissions');
  });
});
