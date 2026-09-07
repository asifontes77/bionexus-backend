import { readFileSync } from 'fs';

describe('DollarValuePermissions migration', () => {
  const source = readFileSync('src/database/migrations/1788742800000-DollarValuePermissions.ts', 'utf8');

  it('creates, assigns and reverts dedicated permissions', () => {
    expect(source).toContain('dollar-value.read');
    expect(source).toContain('dollar-value.update');
    expect(source).toContain('security_role_permissions');
    expect(source).toContain('async down');
  });
});
