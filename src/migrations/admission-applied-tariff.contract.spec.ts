import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('Admission applied tariff migration contract', () => {
  const migration = readFileSync(join(__dirname, '../database/migrations/1789084800000-AdmissionAppliedTariff.ts'), 'utf8');
  const entity = readFileSync(join(__dirname, '../patients/patients.entity.ts'), 'utf8');
  const createDto = readFileSync(join(__dirname, '../patients/dto/create-patients.dto.ts'), 'utf8');
  it('adds nullable tariff without inventing legacy values', () => {
    expect(migration).toContain('ADD COLUMN tariff_id int NULL');
    expect(migration).toContain('ADMISSION_APPLIED_TARIFF_LEGACY_BACKFILL_FORBIDDEN');
    expect(migration).not.toMatch(/UPDATE\s+patient_admissions/i);
  });
  it('protects relation and down path', () => {
    expect(migration).toContain('ON DELETE RESTRICT ON UPDATE RESTRICT');
    expect(migration).toContain('DROP COLUMN tariff_id');
  });
  it('exposes tariff in entity and create DTO', () => {
    expect(entity).toContain("name: 'tariff_id'");
    expect(entity).toContain('tariff_id: number | null;');
    expect(createDto).toContain('tariff_id: number;');
  });
});
