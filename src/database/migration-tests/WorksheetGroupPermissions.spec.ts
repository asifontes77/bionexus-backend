import { WorksheetGroupPermissions1788487200002 } from '../migrations/1788487200002-WorksheetGroupPermissions';

describe('WorksheetGroupPermissions1788487200002', () => {
  it('registra, asigna y revierte los nueve permisos', async () => {
    const queries: string[] = [];
    const runner = {
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as never;
    const migration = new WorksheetGroupPermissions1788487200002();
    await migration.up(runner);
    await migration.down(runner);
    const sql = queries.join(' ');
    const codes = [
      'worksheet-groups.read',
      'worksheet-groups.create',
      'worksheet-groups.update',
      'worksheet-groups.change-status',
      'worksheet-groups.delete',
      'worksheet-group-items.read',
      'worksheet-group-items.create',
      'worksheet-group-items.update',
      'worksheet-group-items.delete',
    ];
    for (const code of codes) expect(sql).toContain(code);
    expect(sql).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(sql).toContain('DELETE assignment FROM security_role_permissions');
    expect(queries).toHaveLength(4);
  });
});
