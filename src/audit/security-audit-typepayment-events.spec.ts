import { readFileSync } from 'fs';
import { join } from 'path';

describe('TypePayment normalized persistent audit wiring',()=>{
  const controller=readFileSync(join(__dirname,'../type_payment/typepayment.controller.ts'),'utf8');
  const service=readFileSync(join(__dirname,'../type_payment/typepayment.service.ts'),'utf8');
  it('propaga actor autenticado',()=>{expect(controller).toContain('getSecurityAuditActorUserId');expect(controller).toContain('createTypepayment(body, getSecurityAuditActorUserId(request) ?? undefined)');expect(controller).toContain('actorUserId);');});
  it('usa la misma transaccion para mutacion, relaciones y auditoria',()=>{for(const token of ['this.dataSource.transaction','manager.getRepository(TypePayment)','replaceCurrencies','this.audit.write(manager'])expect(service).toContain(token);expect(service).toContain("entityType:'type_payment'");});
  it('conserva los cuatro eventos',()=>{for(const event of ['typepayment.created','typepayment.updated','typepayment.activated','typepayment.deactivated'])expect(service).toContain(event);});
});
