import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Patient exam catalog DTO adapter', () => {
  const service = read('src/exams/exams.service.ts');
  const createDto = read('src/exams/dto/create-exams.dto.ts');
  const updateDto = read('src/exams/dto/update-exams.dto.ts');

  it('accepts canonical and legacy input names', () => {
    for (const source of [createDto, updateDto]) {
      expect(source).toContain('examlistsId?: number;');
      expect(source).toContain('exam_catalog_id?: number;');
    }
  });

  it('normalizes before create and update and rejects conflicts', () => {
    expect(service).toContain('normalizeExamCatalogInput(exams, true)');
    expect(service).toContain('normalizeExamCatalogInput(exam, false)');
    expect(service).toContain('EXAM_CATALOG_ID_CONFLICT');
    expect(service).toContain('EXAM_CATALOG_ID_REQUIRED');
    expect(service).toContain('EXAM_CATALOG_ID_INVALID');
  });

  it('preserves examlistsId in direct service responses', () => {
    expect(service).toContain('toLegacyResponse(await this.examRepository.save(newExam))');
    expect(service).toContain('toLegacyResponse(await this.examRepository.save(updateExam))');
    expect(service).toContain('exam.examlistsId = exam.exam_catalog_id;');
  });
});
