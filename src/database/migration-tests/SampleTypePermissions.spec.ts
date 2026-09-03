import { SampleTypePermissions1788487200001 } from '../migrations/1788487200001-SampleTypePermissions';

describe('SampleTypePermissions1788487200001', () => {
  it('registra y revierte los permisos de tipos de muestra', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as never;
    const migration = new SampleTypePermissions1788487200001();
    await migration.up(queryRunner);
    await migration.down(queryRunner);
    const sql = queries.join(' ');
    for (const code of [
      'sample-types.read',
      'sample-types.create',
      'sample-types.update',
    ])
      expect(sql).toContain(code);
  });
});
