import { readFileSync } from 'fs';
import { join } from 'path';

describe('Sample types hardened contract', () => {
  const controller = readFileSync(
    join(__dirname, 'sampletype.controller.ts'),
    'utf8',
  );
  const service = readFileSync(
    join(__dirname, 'sampletype.service.ts'),
    'utf8',
  );
  const moduleSource = readFileSync(
    join(__dirname, 'sampletype.module.ts'),
    'utf8',
  );
  const baseline = readFileSync(
    join(__dirname, '..', 'database', 'migrations', '1790366400000-BioNexusBaseline.ts'),
    'utf8',
  );

  it('protege lectura, creacion y actualizacion con permisos dedicados', () => {
    for (const code of [
      'sample-types.read',
      'sample-types.create',
      'sample-types.update',
    ])
      expect(controller).toContain(code);
    expect(baseline).toContain('BASELINE_GZIP_BASE64');
  });

  it('conserva descripcion y agrega estado sin eliminacion fisica', () => {
    expect(controller).toContain("@Controller('Sampletype')");
    expect(controller).not.toContain('@Delete');
    expect(service).toContain('annulled');
  });

  it('valida, evita duplicados y audita dentro de transaccion', () => {
    for (const code of [
      'SAMPLE_TYPE_DESCRIPTION_REQUIRED',
      'SAMPLE_TYPE_DESCRIPTION_TOO_LONG',
      'SAMPLE_TYPE_UPDATE_REQUIRED',
      'SAMPLE_TYPE_DESCRIPTION_ALREADY_EXISTS',
    ])
      expect(service).toContain(code);
    expect(service).toContain('this.dataSource.transaction');
    expect(service).toContain('this.audit.write(manager');
    expect(moduleSource).toContain('AuthorizationModule');
    expect(moduleSource).toContain('SecurityAuditModule');
  });
});