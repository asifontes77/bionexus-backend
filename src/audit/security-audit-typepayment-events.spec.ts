import { readFileSync } from 'fs';
import { join } from 'path';

describe('TypePayment persistent audit wiring', () => {
  const controller = readFileSync(join(__dirname, '../type_payment/typepayment.controller.ts'), 'utf8');
  const service = readFileSync(join(__dirname, '../type_payment/typepayment.service.ts'), 'utf8');

  it('propaga el actor autenticado', () => {
    expect(controller).toContain('getSecurityAuditActorUserId');
    expect(controller).toContain('actorUserId ?? undefined');
    expect(controller).toContain('actorUserId,');
  });

  it('usa la misma transaccion para mutacion y auditoria', () => {
    expect(service).toContain('this.dataSource.transaction');
    expect(service).toContain('manager.getRepository(TypePayment)');
    expect(service).toContain('this.securityAuditService.write(manager');
    expect(service).toContain("entityType: 'type_payment'");
  });

  it('registra los cuatro eventos', () => {
    expect(service).toContain("'typepayment.created'");
    expect(service).toContain("'typepayment.updated'");
    expect(service).toContain("'typepayment.activated'");
    expect(service).toContain("'typepayment.deactivated'");
  });
});
