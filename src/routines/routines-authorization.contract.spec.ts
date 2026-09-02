import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');
describe('Routines authorization contract', () => {
  const controller = read('src/routines/routines.controller.ts');
  const module = read('src/routines/routines.module.ts');
  const migration = read('src/database/migrations/1788312600000-RoutinesPermissions.ts');
  it('protects every endpoint with the approved foundation', () => {
    expect(controller).toContain('@UseGuards(JwtUserGuard, PermissionGuard)');
    for (const code of ['routines.read','routines.create','routines.update','routines.delete']) expect(controller).toContain(`@RequirePermissions('${code}')`);
    expect(controller).toContain("@Post()");
  });
  it('imports AuthorizationModule', () => { expect(module).toContain('AuthorizationModule'); });
  it('uses an idempotent admin migration', () => {
    expect(migration).toContain('ON DUPLICATE KEY UPDATE');
    expect(migration).toContain('INSERT IGNORE INTO security_role_permissions');
    expect(migration).toContain("role.code = 'admin'");
    expect(migration).toContain('role.is_active = 1');
  });
});
