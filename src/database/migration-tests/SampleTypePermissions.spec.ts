import { readFileSync } from 'node:fs';
describe('SampleTypePermissions migration', () => {
  const source = readFileSync(
    'src/database/migrations/1788487200001-SampleTypePermissions.ts',
    'utf8',
  );
  it('contains three permissions and admin assignment', () => {
    for (const value of [
      'sample-types.read',
      'sample-types.create',
      'sample-types.update',
      'security_role_permissions',
      'role.code',
      "'admin'",
      'role.is_active',
      'security_role_permissions',
    ])
      expect(source).toContain(value);
  });
  it('is reversible', () => {
    expect(source).toContain('async down');
    expect(source).toContain('DELETE FROM security_permissions');
  });
});
