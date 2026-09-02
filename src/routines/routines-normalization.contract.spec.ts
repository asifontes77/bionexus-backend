import { readFileSync } from 'node:fs';
const service = readFileSync('src/routines/routines.service.ts', 'utf8');
const createDto = readFileSync('src/routines/dto/create-routines.dto.ts', 'utf8');
describe('Normalized routines service contract', () => {
  it('uses transactions and normalized items for every write', () => {
    expect(service.match(/dataSource\.transaction/g)?.length).toBe(3);
    expect(service).toContain('replaceItems(manager, routine.id, exams)');
    expect(service).toContain('replaceItems(manager, id, exams)');
    expect(service).toContain("delete({ routine_id: id })");
  });
  it('validates identifiers, duplicates, active and referenced catalogs', () => {
    for (const code of ['ROUTINE_EXAM_ID_INVALID','ROUTINE_EXAM_DUPLICATED','ROUTINE_EXAM_ACTIVE_INVALID','ROUTINE_EXAMS_NOT_FOUND']) expect(service).toContain(code);
    expect(service).toContain('id: In(ids)');
  });
  it('preserves active presence and omission in the legacy projection', () => {
    expect(service).toContain('legacy_active_present: item.activePresent');
    expect(service).toContain('if (item.legacy_active_present) value.active');
    expect(service).toContain("item.activePresent ? { examId: item.examId, active: item.active } : { examId: item.examId }");
  });
  it('accepts both arrays and JSON strings through the legacy field', () => {
    expect(createDto).toContain('registered_exams: unknown;');
    expect(service).toContain("parsed = JSON.parse(value)");
    expect(service).toContain('Array.isArray(parsed)');
  });
  it('keeps legacy routes and ordered relational reads', () => {
    expect(service).toContain("items: { position: 'ASC' }");
    expect(readFileSync('src/routines/routines.controller.ts','utf8')).toContain("@Controller('routines')");
  });
});
