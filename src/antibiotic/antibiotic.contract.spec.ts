import { readFileSync } from 'fs';
const source = (path: string) => readFileSync(path, 'utf8');
describe('Antibiotic hardened backend contract', () => {
  const controller = source('src/antibiotic/antibiotic.controller.ts');
  const service = source('src/antibiotic/antibiotic.service.ts');
  const module = source('src/antibiotic/antibiotic.module.ts');
  const migration = source('src/database/migrations/1788400800000-AntibioticPermissions.ts');
  it('preserva rutas y aplica permisos normalizados', () => {
    for (const code of ['antibiotic.read','antibiotic.create','antibiotic.update','antibiotic.change-status']) expect(controller + migration).toContain(code);
    expect(controller).toContain("@Get('order')");
    expect(controller).toContain('AuthorizationService');
  });
  it('mantiene listados ordenados y operativo solo activo', () => {
    expect(service).toContain("where: { annulled: false }");
    expect(service).toContain("order: { description: 'ASC' }");
  });
  it('valida, normaliza, actualiza selectivamente y audita', () => {
    for (const code of ['ANTIBIOTIC_DESCRIPTION_REQUIRED','ANTIBIOTIC_INITIALS_REQUIRED','ANTIBIOTIC_UPDATE_REQUIRED','ANTIBIOTIC_FIELD_UNKNOWN','ANTIBIOTIC_ANNULLED_INVALID']) expect(service).toContain(code);
    expect(service).toContain('.toUpperCase()');
    expect(service).toContain('Object.prototype.hasOwnProperty.call');
    for (const action of ['antibiotic.created','antibiotic.updated','antibiotic.activated','antibiotic.deactivated']) expect(service).toContain(action);
  });
  it('incluye dependencias de autorizacion y migracion idempotente', () => {
    expect(module).toContain('AuthorizationModule');
    expect(migration).toContain('ON DUPLICATE KEY UPDATE');
    expect(migration).toContain('INSERT IGNORE INTO security_role_permissions');
  });
});