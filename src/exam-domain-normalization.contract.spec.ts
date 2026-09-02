import { readFileSync } from 'node:fs';

const migration = readFileSync('src/database/migrations/1788271200000-ExamDomainNormalization.ts', 'utf8');

describe('Exam domain normalization contract', () => {
  it('creates the normalized relation before renaming tables', () => {
    expect(migration.indexOf('CREATE TABLE \\`exam_routine_items\\`')).toBeLessThan(migration.indexOf('RENAME TABLE'));
    expect(migration).toContain("JSON_TABLE(r.registered_exams,'$[*]'");
    expect(migration).toContain("exam_id INT PATH '$.examId'");
    expect(migration).toContain('position FOR ORDINALITY');
  });

  it('preserves legacy active semantics and registered_exams', () => {
    expect(migration).toContain("active_present INT EXISTS PATH '$.active'");
    expect(migration).toContain('legacy_active_present');
    expect(migration).not.toContain('DROP COLUMN `registered_exams`');
  });

  it('renames the domain tables and transactional catalog column', () => {
    expect(migration).toContain('`exam_lists` TO `exam_catalog`');
    expect(migration).toContain('`routines` TO `exam_routines`');
    expect(migration).toContain('`exams` TO `patient_exams`');
    expect(migration).toContain('`examlistsId` `exam_catalog_id`');
  });

  it('validates preservation dynamically and supports down', () => {
    expect(migration).toContain('source_item_count');
    expect(migration).toContain('migratedItemCount !== sourceItemCount');
    expect(migration).toContain('migratedRoutineCount > sourceRoutineCount');
    expect(migration).toContain('EXAM_DOMAIN_DATA_PRESERVATION_FAILED');
    expect(migration).toContain('`exam_catalog` TO `exam_lists`');
    expect(migration).toContain('DROP TABLE `exam_routine_items`');
  });
});
