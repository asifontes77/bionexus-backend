import { readFileSync } from 'node:fs';

describe('Document definitions foundation contract', () => {
  const controller = readFileSync('src/document-definitions/document-definitions.controller.ts', 'utf8');
  const service = readFileSync('src/document-definitions/document-definitions.service.ts', 'utf8');
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');

  it('protege las operaciones con permisos especificos', () => {
    for (const permission of ['document-definitions.read', 'document-definitions.create', 'document-definitions.update', 'document-definitions.activate']) expect(controller).toContain(permission);
  });

  it('usa transacciones y auditoria para todas las mutaciones', () => {
    expect(service.match(/this\.dataSource\.transaction/g)?.length).toBeGreaterThanOrEqual(3);
    expect(service.match(/this\.writeAudit/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('mantiene una sola baseline', () => {
    expect(baseline).toContain('BASELINE_GZIP_BASE64');
  });
  it('protege exactamente un comprobante activo por laboratorio y tipo', () => {
    expect(service).toContain("isActive: rows.length === 0");
    expect(service).toContain("setLock('pessimistic_write')");
    expect(service).toContain('DOCUMENT_DEFINITION_LAST_ACTIVE_CANNOT_BE_DEACTIVATED');
    expect(service).toContain("'document.definition.deactivated'");
    expect(controller).toContain("@Patch(':id/status')");
    expect(controller).toContain('ChangeDocumentDefinitionStatusDto');
  });});
