import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Protege las relaciones fisicas del bloque de seguridad dentro de la unica
 * migracion baseline permitida para Bio Nexus.
 */
describe('Security relational normalization contract', () => {
  const migrationPath = 'src/database/migrations/1790366400000-BioNexusBaseline.ts';
  const migration = readFileSync(migrationPath, 'utf8');

  /** Obtiene recursivamente los archivos TypeScript de una carpeta. */
  const getTypeScriptFiles = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? getTypeScriptFiles(path) : path.endsWith('.ts') ? [path] : [];
  });

  /** Verifica las siete FK y sus politicas fisicas. */
  it('keeps all security foreign keys in the baseline', () => {
    const constraints = [
      'FK_security_role_permissions_role',
      'FK_security_role_permissions_permission',
      'FK_security_user_roles_user',
      'FK_security_user_roles_role',
      'FK_security_user_permission_overrides_user',
      'FK_security_user_permission_overrides_permission',
      'FK_security_audit_logs_actor_user',
    ];

    for (const constraint of constraints) expect(migration).toContain(constraint);
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).toContain('ON DELETE SET NULL');
  });

  /** Confirma la unicidad de cada par mediante las PK compuestas de las entidades. */
  it('keeps composite primary keys for bridge uniqueness', () => {
    const sources = getTypeScriptFiles('src/authorization').map((path) => readFileSync(path, 'utf8'));
    const bridges = [
      { table: 'security_role_permissions', properties: ['roleId', 'permissionId'] },
      { table: 'security_user_roles', properties: ['userId', 'roleId'] },
      { table: 'security_user_permission_overrides', properties: ['userId', 'permissionId'] },
    ];

    for (const bridge of bridges) {
      const entity = sources.find((source) => source.includes(bridge.table));
      expect(entity).toBeDefined();
      for (const property of bridge.properties) {
        const primaryPattern = new RegExp(`@PrimaryColumn\\([\\s\\S]{0,300}?\\)\\s*${property}\\s*[!:?]`);
        expect(entity).toMatch(primaryPattern);
      }
    }
  });

  /** Evita crear migraciones incrementales durante la etapa baseline. */
  it('keeps exactly one migration file', () => {
    const migrations = readdirSync('src/database/migrations').filter((name) => name.endsWith('.ts'));
    expect(migrations).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });
});
