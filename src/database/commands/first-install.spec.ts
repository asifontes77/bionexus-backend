import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertSafeDatabaseName,
  INITIAL_CATALOG_SCHEMA_VERSION,
  isFirstInstallStateValid,
  REQUIRED_GRANULAR_CATALOG_PACKAGES,
  serializeInstallError,
} from './first-install';

describe('first-install platform scope', () => {
  it('admite bionexus y nombres temporales controlados', () => {
    expect(assertSafeDatabaseName('bionexus')).toBe('bionexus');
    expect(assertSafeDatabaseName('bionexus_test_20261103')).toBe('bionexus_test_20261103');
  });

  it('rechaza bases fuera del alcance Bio Nexus', () => {
    expect(() => assertSafeDatabaseName('postgres')).toThrow('UNSAFE_INSTALL_DATABASE');
    expect(() => assertSafeDatabaseName('otra_base')).toThrow('UNSAFE_INSTALL_DATABASE');
  });

  it('serializa el error completo y su causa', () => {
    const cause = Object.assign(new Error('inner'), { code: '23505', detail: 'duplicate', constraint: 'uq_test' });
    expect(serializeInstallError(Object.assign(new Error('outer'), { cause }))).toMatchObject({
      message: 'outer',
      cause: { message: 'inner', code: '23505', detail: 'duplicate', constraint: 'uq_test' },
    });
  });

  it('valida los once releases granulares y compatibles sin contar ni retirar releases legacy publicados', () => {
    expect(REQUIRED_GRANULAR_CATALOG_PACKAGES).toHaveLength(11);
    expect(INITIAL_CATALOG_SCHEMA_VERSION).toBe('BioNexusBaseline1790366400000');

    const freshInstall = { active_owners: 1, global_releases: 11, granular_releases: 11, laboratories: 0, users: 0 };
    const upgradedInstall = { active_owners: 1, global_releases: 16, granular_releases: 11, laboratories: 0, users: 0 };
    const incompleteInstall = { ...upgradedInstall, granular_releases: 10 };

    expect(isFirstInstallStateValid(freshInstall)).toBe(true);
    expect(isFirstInstallStateValid(upgradedInstall)).toBe(true);
    expect(isFirstInstallStateValid(incompleteInstall)).toBe(false);
  });

  it('mantiene el contrato observable y la limpieza de la base creada por la ejecucion', () => {
    const source = readFileSync(join(__dirname, 'first-install.ts'), 'utf8');
    expect(source).toContain("type:'cleanup'");
    expect(source).toContain('databaseCreatedByRun');
    expect(source).toContain("process.env.ComSpec ?? 'cmd.exe'");
    expect(source).toContain("JwtModule.registerAsync({ global: true");
    expect(source).toContain("FROM laboratory) AS laboratories");
    expect(source).toContain("AS granular_releases");
    expect(source).toContain("package_code=ANY($1::text[])");
    expect(source).not.toContain('Number(result.global_releases)!==6');
    expect(source).not.toContain("FROM laboratories) AS laboratories");
  });
});
