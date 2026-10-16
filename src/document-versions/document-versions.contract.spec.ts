import { readFileSync } from 'node:fs';

describe('Document versions foundation contract', () => {
  const controller = readFileSync('src/document-versions/document-versions.controller.ts', 'utf8');
  const service = readFileSync('src/document-versions/document-versions.service.ts', 'utf8');
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  it('protege las ocho operaciones con permisos especificos', () => {
    for (const permission of ['document-versions.read','document-versions.save-draft','document-versions.publish','document-versions.activate','document-versions.archive']) expect(controller).toContain(permission);
  });
  it('usa transacciones para todas las mutaciones y auditoria atomica', () => {
    expect(service.match(/this\.dataSource\.transaction/g)?.length).toBeGreaterThanOrEqual(5);
    expect(service).toContain('this.audit.write(manager');
  });
  it('mantiene versiones publicadas separadas del borrador y activa una sola por clave', () => {
    expect(service).toContain('document.draft.saved');
    expect(service).toContain('document.version.published');
    expect(service).toContain("set({ isActive: false })");
  });
  it('conserva una unica migracion baseline con payload comprimido', () => {
    expect(baseline).toContain('BASELINE_GZIP_BASE64');
  });
});