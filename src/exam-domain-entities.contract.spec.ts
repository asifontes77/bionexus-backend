import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Normalized exam domain entity mappings', () => {
  it('maps legacy classes to normalized physical tables', () => {
    expect(read('src/exam_lists/examlists.entity.ts')).toContain("@Entity({ name: 'exam_catalog' })");
    expect(read('src/exams/exams.entity.ts')).toContain("@Entity({ name: 'patient_exams' })");
    expect(read('src/routines/routines.entity.ts')).toContain("@Entity({ name: 'exam_routines' })");
  });

  it('maps the legacy property to exam_catalog_id without breaking the API shape', () => {
    const patientExam = read('src/exams/exams.entity.ts');
    expect(patientExam).toContain("name: 'exam_catalog_id'");
    expect(patientExam).toContain('exam_catalog_id: number;');
    expect(patientExam).toContain('examlistsId: number;');
    expect(patientExam).toContain('AfterLoad()');
  });

  it('registers the normalized routine item relation', () => {
    const item = read('src/routines/exam-routine-item.entity.ts');
    expect(item).toContain("@Entity({ name: 'exam_routine_items' })");
    expect(item).toContain('routine_id: number;');
    expect(item).toContain('exam_catalog_id: number;');
    expect(item).toContain('position: number;');
    expect(item).toContain('legacy_active_present: boolean;');
    expect(read('src/routines/routines.module.ts')).toContain('TypeOrmModule.forFeature([Routines, ExamRoutineItem])');
  });

  it('keeps transitional endpoints and registered_exams', () => {
    expect(read('src/exam_lists/examlists.controller.ts')).toContain("@Controller('examlists')");
    expect(read('src/exams/exams.controller.ts')).toContain("@Controller('exams')");
    expect(read('src/routines/routines.controller.ts')).toContain("@Controller('routines')");
    expect(read('src/routines/routines.entity.ts')).toContain('registered_exams: string;');
  });
});
