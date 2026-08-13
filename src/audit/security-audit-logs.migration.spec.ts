import { SecurityAuditLogs2026081300000 } from '../database/migrations/2026081300000-SecurityAuditLogs';

describe('SecurityAuditLogs2026081300000', () => {
  it('crea tabla, indices, FK y permite revertirla', async () => {
    const query = jest.fn();
    const migration = new SecurityAuditLogs2026081300000();

    await migration.up({ query } as never);

    const upSql = query.mock.calls
      .map((call) => String(call[0]))
      .join(' ');

    expect(upSql).toContain(
      'CREATE TABLE security_audit_logs',
    );
    expect(upSql).toContain(
      'FK_security_audit_logs_actor',
    );
    expect(upSql).toContain('ON DELETE SET NULL');
    expect(upSql).toContain('ON UPDATE RESTRICT');
    expect(upSql).toContain('metadata_json json NULL');

    query.mockClear();
    await migration.down({ query } as never);

    expect(query).toHaveBeenCalledWith(
      'DROP TABLE IF EXISTS security_audit_logs',
    );
  });
});
