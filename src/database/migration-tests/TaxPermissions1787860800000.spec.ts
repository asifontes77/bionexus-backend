import { QueryRunner } from 'typeorm';
import { TaxPermissions1787860800000 } from '../migrations/1787860800000-TaxPermissions';
describe('TaxPermissions1787860800000', () => {
  it('registers four permissions including safe status change', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new TaxPermissions1787860800000().up({ query } as unknown as QueryRunner);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    for (const code of ['tax.read', 'tax.create', 'tax.update']) expect(sql).toContain(code);
    expect(sql).not.toContain('tax.delete');
    expect(sql).toContain("role.code = 'admin'");
  });
});
