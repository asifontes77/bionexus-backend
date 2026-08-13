import { readFileSync } from 'fs';
import { join } from 'path';

describe('Parasiticforms persistent audit wiring', () => {
  const controller = readFileSync(
    join(__dirname, '../parasiticforms/parasiticforms.controller.ts'),
    'utf8',
  );
  const service = readFileSync(
    join(__dirname, '../parasiticforms/parasiticforms.service.ts'),
    'utf8',
  );

  it('propaga el actor autenticado en create y update', () => {
    expect(controller).toContain('getSecurityAuditActorUserId');
    expect(controller).toContain('actorUserId ?? undefined');
    expect(controller).toContain('actorUserId,');
  });

  it('usa la misma transaccion para mutacion y auditoria', () => {
    expect(service).toContain('this.dataSource.transaction');
    expect(service).toContain('manager.getRepository(Parasiticforms)');
    expect(service).toContain('this.securityAuditService.write(manager');
    expect(service).toContain("entityType: 'parasiticform'");
  });

  it('registra los cuatro eventos administrativos', () => {
    expect(service).toContain("'parasiticforms.created'");
    expect(service).toContain("'parasiticforms.updated'");
    expect(service).toContain("'parasiticforms.activated'");
    expect(service).toContain("'parasiticforms.deactivated'");
  });

  it('clasifica el estado booleano y conserva metadata segura', () => {
    expect(service).toContain('Boolean(existing.annulled)');
    expect(service).toContain('changedFields');
    expect(service).toContain('previousDescription');
    expect(service).toContain('previousAnnulled');
  });
});
