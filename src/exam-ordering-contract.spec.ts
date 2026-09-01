import { readFileSync } from 'fs';
import { join } from 'path';

describe('Exam ordering backend contract', () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
  it('expone reordenamiento protegido para grupos', () => {
    const source = read('src/exam_group/examgroup.controller.ts');
    expect(source).toContain("@RequirePermissions('exam-catalog.update') @Patch('reorder')");
    expect(source).toContain('return this.service.reorder');
  });
  it('expone reordenamiento protegido para examenes', () => {
    const source = read('src/exam_lists/examlists.controller.ts');
    expect(source).toContain("@RequirePermissions('exam-catalog.update') @Patch('reorder')");
    expect(source).toContain('groupId?:unknown;ids?:unknown');
  });
  it('usa transacciones, bloqueo y posiciones consecutivas', () => {
    const groups = read('src/exam_group/examgroup.service.ts');
    const exams = read('src/exam_lists/examlists.service.ts');
    for (const source of [groups, exams]) {
      expect(source).toContain('.transaction(async m=>');
      expect(source).toContain("setLock('pessimistic_write')");
      expect(source).toContain('position=index+1');
    }
  });
  it('registra auditoria y evita el guardado individual legacy', () => {
    expect(read('src/exam_group/examgroup.service.ts')).toContain('exam-groups.reordered');
    expect(read('src/exam_lists/examlists.service.ts')).toContain('exam-catalog.reordered');
  });
});
