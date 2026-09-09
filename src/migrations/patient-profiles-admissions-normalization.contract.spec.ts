import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PatientProfilesAndAdmissionsNormalization migration contract', () => {
  const source = readFileSync(join(__dirname, '../database/migrations/1788836400000-PatientProfilesAndAdmissionsNormalization.ts'), 'utf8');

  it('creates the patient master and renames admissions without deleting history', () => {
    expect(source).toContain('CREATE TABLE patient_profiles');
    expect(source).toContain('RENAME TABLE patients TO patient_admissions');
    expect(source).toContain('source_admission_id');
    expect(source).not.toMatch(/DELETE\s+FROM\s+patient/i);
  });

  it('links every admission and protects referential integrity', () => {
    expect(source).toContain('patient_profile_id');
    expect(source).toContain('PATIENT_ADMISSION_PROFILE_LINK_INCOMPLETE');
    expect(source).toContain('FK_patient_admissions_profile_id');
    expect(source).toContain('ON DELETE RESTRICT');
  });

  it('provides a reversible down path', () => {
    expect(source).toContain('RENAME TABLE patient_admissions TO patients');
    expect(source).toContain('DROP TABLE patient_profiles');
  });
});