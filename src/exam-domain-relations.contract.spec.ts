import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Normalized exam catalog auxiliary relations', () => {
  it.each([
    ['src/group_ht_items/group_ht_items.entity.ts', 'examId: number;', "@JoinColumn({ name: 'examId' })"],
    ['src/special_test_items/special_test_items.entity.ts', 'exam_list_Id: number;', "@JoinColumn({ name: 'exam_list_Id' })"],
    ['src/invoice_items/invoiceitems.entity.ts', 'id_exams: number;', "@JoinColumn({ name: 'id_exams' })"],
  ])('maps %s to ExamCatalog while preserving the legacy property', (path, property, joinColumn) => {
    const source = read(path);
    expect(source).toContain("import { Examlists } from 'src/exam_lists/examlists.entity';");
    expect(source).toContain(property);
    expect(source).toContain(joinColumn);
    expect(source).toContain('examCatalog: Examlists;');
    expect(source).toContain("onDelete: 'RESTRICT'");
    expect(source).toContain("onUpdate: 'RESTRICT'");
  });

  it('does not rename the physical auxiliary columns without a migration', () => {
    const combined = [
      read('src/group_ht_items/group_ht_items.entity.ts'),
      read('src/special_test_items/special_test_items.entity.ts'),
      read('src/invoice_items/invoiceitems.entity.ts'),
    ].join('\n');
    expect(combined).not.toContain("name: 'exam_catalog_id'");
  });
});
