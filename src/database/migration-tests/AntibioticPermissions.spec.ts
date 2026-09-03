import { QueryRunner } from 'typeorm';
import { AntibioticPermissions1788400800000 } from '../migrations/1788400800000-AntibioticPermissions';
describe('AntibioticPermissions1788400800000', () => {
  it('registra cuatro permisos y los asigna al admin activo', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new AntibioticPermissions1788400800000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    for (const code of ['antibiotic.read','antibiotic.create','antibiotic.update','antibiotic.change-status']) expect(sql).toContain(code);
    expect(sql).toContain("role.code='admin'");
    expect(sql).toContain('role.is_active=1');
  });
});