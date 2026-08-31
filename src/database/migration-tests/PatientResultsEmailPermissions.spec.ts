import { QueryRunner } from 'typeorm';
import { PatientResultsEmailPermissions1788137100000 } from '../migrations/1788137100000-PatientResultsEmailPermissions';

describe('PatientResultsEmailPermissions1788137100000', () => {
  let query: jest.Mock;
  let runner: QueryRunner;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue(undefined);
    runner = { query } as unknown as QueryRunner;
  });

  it('registra los permisos de consulta y envio de forma idempotente', async () => {
    await new PatientResultsEmailPermissions1788137100000().up(runner);
    expect(query).toHaveBeenCalledTimes(2);
    const sql = query.mock.calls.map(([value]) => String(value)).join('\n');
    expect(sql).toContain('patient-results-email.read');
    expect(sql).toContain('patient-results-email.send');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(sql).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(sql).toContain("role.code = 'admin'");
    expect(sql).toContain('role.is_active = 1');
  });

  it('revierte primero las asignaciones y despues el catalogo', async () => {
    await new PatientResultsEmailPermissions1788137100000().down(runner);
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[0][0])).toContain('DELETE assignment');
    expect(String(query.mock.calls[1][0])).toContain('DELETE FROM security_permissions');
  });
});
