import { readFileSync, readdirSync } from 'fs';

/** Protege la fundacion de aprovisionamiento modular por laboratorio. */
describe('Modular provisioning foundation contract', () => {
  const migration = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');

  /** Conserva el catalogo global de modulos sin duplicados normalizados. */
  it('keeps the global application module catalog', () => {
    expect(migration).toContain('CREATE TABLE "application_modules"');
    expect(migration).toContain('UQ_application_modules_code_normalized');
    expect(migration).toContain('FROM "security_permissions"');
    expect(migration).toContain('ON CONFLICT DO NOTHING');
  });

  /** Conserva la asignacion de modulos por laboratorio. */
  it('keeps laboratory module assignments and physical relations', () => {
    expect(migration).toContain('CREATE TABLE "laboratory_modules"');
    expect(migration).toContain('PK_laboratory_modules');
    expect(migration).toContain('FK_laboratory_modules_laboratory');
    expect(migration).toContain('FK_laboratory_modules_module');
    expect(migration).toContain('IX_laboratory_modules_enabled');
  });

  /** Evita que la baseline asigne modulos a un laboratorio inexistente. */
  it('does not provision a laboratory or module assignment in the basic seed', () => {
    expect(migration).not.toContain('INSERT INTO "laboratory_modules"');
    expect(migration).not.toMatch(/INSERT INTO\s+"laboratory"\s*\(/);
  });

  /** Conserva una unica migracion baseline. */
  it('keeps exactly one migration file', () => {
    const migrations = readdirSync('src/database/migrations').filter((name) => name.endsWith('.ts'));
    expect(migrations).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });
});
