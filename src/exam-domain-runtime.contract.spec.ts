import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Normalized exam domain runtime contract', () => {
  it('uses exam_catalog in direct runtime SQL', () => {
    const taxService = read('src/tax/tax.service.ts');
    expect(taxService).toContain('SELECT COUNT(*) AS referenceCount FROM exam_catalog WHERE tax_id = ?');
    expect(taxService).not.toContain('FROM exam_lists WHERE tax_id');
  });

  it('keeps property paths while TypeORM maps the normalized physical column', () => {
    const entity = read('src/exams/exams.entity.ts');
    const service = read('src/exams/exams.service.ts');
    const patients = read('src/patients/patients.service.ts');
    expect(entity).toContain("name: 'exam_catalog_id'");
    expect(entity).toContain('examlistsId: number;');
    expect(service).toContain('exam.examlistsId');
    expect(patients).toContain('exam.examlistsId');
  });

  it('does not alter historical migrations or transitional HTTP routes', () => {
    expect(read('src/exam_lists/examlists.controller.ts')).toContain("@Controller('examlists')");
    expect(read('src/exams/exams.controller.ts')).toContain("@Controller('exams')");
    expect(read('src/routines/routines.controller.ts')).toContain("@Controller('routines')");
  });
});
