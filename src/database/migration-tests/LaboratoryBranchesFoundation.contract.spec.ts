import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

describe('Laboratory branches foundation contract', () => {
  const entity = readFileSync('src/laboratory/laboratory-branch.entity.ts', 'utf8');
  const migration = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  const payload = migration.match(/const BASELINE_GZIP_BASE64 = '([^']+)'/)?.[1] ?? '';
  const sql = gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');

  it('mantiene una sola baseline y crea sucursales dentro de ella', () => {
    expect(migration).toContain('BioNexusBaseline1790366400000');
    expect(sql).toContain('CREATE TABLE public.laboratory_branches');
    expect(sql).toContain('FK_laboratory_branches_laboratory');
  });

  it('restringe codigo y sucursal principal al alcance del laboratorio', () => {
    expect(sql).toContain('UQ_laboratory_branches_laboratory_code');
    expect(sql).toContain('UQ_laboratory_branches_single_main');
    expect(entity).toContain("['laboratoryId', 'code']");
  });

  it('crea una sucursal principal inicial para cada laboratorio existente', () => {
    expect(sql).toContain("SELECT id, 'MAIN', 'Sucursal principal'");
    expect(sql).toContain('FROM public.laboratory');
  });

  it('protege pertenencia y borrado del laboratorio', () => {
    expect(entity).toContain("@JoinColumn({ name: 'laboratory_id' })");
    expect(entity).toContain("onDelete: 'RESTRICT'");
    expect(entity).toContain("onUpdate: 'RESTRICT'");
  });
});
