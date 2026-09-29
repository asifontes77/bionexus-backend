import { readFileSync } from 'node:fs';
const read=(file:string)=>readFileSync(file,'utf8');
describe('Routine status contract',()=>{
 const controller=read('src/routines/routines.controller.ts');
 const service=read('src/routines/routines.service.ts');
 const dto=read('src/routines/dto/change-routine-status.dto.ts');
 it('protects the status endpoint',()=>{expect(controller).toContain("@Patch(':id/status')");expect(controller).toContain("@RequirePermissions('routines.update')");expect(controller).toContain('getSecurityAuditActorUserId(request)');expect(dto).toContain('isActive: boolean');});
 it('changes status transactionally and with a lock',()=>{expect(service).toContain('async changeStatus(');expect(service).toContain("setLock('pessimistic_write')");expect(service).toContain('dataSource.transaction');expect(service).toContain('ROUTINE_STATUS_INVALID');expect(service).toContain('ROUTINE_STATUS_ACTOR_REQUIRED');});
 it('audits activation and deactivation',()=>{expect(service).toContain("'routine.activated'");expect(service).toContain("'routine.deactivated'");expect(service).toContain('ROUTINE_STATUS_AUDIT_UNAVAILABLE');});
});
