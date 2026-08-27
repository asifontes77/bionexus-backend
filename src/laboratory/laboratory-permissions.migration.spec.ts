import { QueryRunner } from 'typeorm';
import { LaboratoryPermissions20260827101500 } from '../database/migrations/20260827101500-LaboratoryPermissions';

describe('LaboratoryPermissions20260827101500', () => {
  let query: jest.Mock;
  let runner: QueryRunner;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue(undefined);
    runner = { query } as unknown as QueryRunner;
  });

  it('registra los tres permisos de forma idempotente y los asigna a admin', async () => {
    await new LaboratoryPermissions20260827101500().up(runner);
    expect(query).toHaveBeenCalledTimes(2);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    for (const code of ['laboratory.read', 'laboratory.update', 'laboratory.upload-logo']) {
      expect(sql).toContain(code);
    }
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(sql).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(sql).toContain("role.code = 'admin'");
  });

  it('revierte primero asignaciones y luego el catalogo', async () => {
    await new LaboratoryPermissions20260827101500().down(runner);
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[0][0])).toContain('DELETE assignment');
    expect(String(query.mock.calls[1][0])).toContain('DELETE FROM security_permissions');
  });
});