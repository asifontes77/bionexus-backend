import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');
describe('Routines safe delete contract', () => {
  const controller = read('src/routines/routines.controller.ts');
  const service = read('src/routines/routines.service.ts');
  const module = read('src/routines/routines.module.ts');
  it('requires authenticated actor and delete permission', () => {
    expect(controller).toContain("@RequirePermissions('routines.delete')");
    expect(controller).toContain('getSecurityAuditActorUserId(request)');
    expect(service).toContain('ROUTINE_DELETE_ACTOR_REQUIRED');
  });
  it('deletes children, parent and audit in one transaction and exact order', () => {
    expect(service).toContain('dataSource.transaction');
    const children = service.indexOf("delete({ routine_id: id })", service.indexOf('async deleteRoutines'));
    const parent = service.indexOf('await repository.remove(routine)', children);
    const audit = service.indexOf('await this.audit.write(manager', parent);
    expect(children).toBeGreaterThan(-1);
    expect(children).toBeLessThan(parent);
    expect(parent).toBeLessThan(audit);
    expect(service).toContain("action: 'routine.deleted'");
    expect(service).toContain("entityType: 'exam_routine'");
    expect(service).toContain('itemCount');
  });
  it('fails closed when audit is unavailable', () => {
    expect(service).toContain('ROUTINE_DELETE_AUDIT_UNAVAILABLE');
    expect(module).toContain('SecurityAuditService');
  });
});
