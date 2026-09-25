import { readFileSync } from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
describe('Exam catalog abbreviation uniqueness',()=>{
  const service=read('src/exam_lists/examlists.service.ts');
  const migration=read('src/database/migrations/1790452800000-ExamCatalogAbbreviationUnique.ts');
  it('validates description and abbreviation inside the group on create and update',()=>{
    expect(service).toContain("EXAM_CATALOG_ABBREVIATION_ALREADY_EXISTS");
    expect(service).toContain("UPPER(TRIM(e.abbreviation))=UPPER(:a)");
    expect(service).toContain("await this.unique(r,Number(d.group_id),String(d.description),String(d.abbreviation))");
    expect(service).toContain("Object.prototype.hasOwnProperty.call(b,'abbreviation')");
  });
  it('converts concurrent unique index errors to a controlled conflict',()=>{
    expect(service).toContain("driver?.code==='ER_DUP_ENTRY'");
    expect(service).toContain("driver?.errno===1062");
    expect(service).toContain("UX_exam_catalog_group_abbreviation");
  });
  it('protects persistence with an idempotent migration',()=>{
    expect(migration).toContain('EXAM_CATALOG_ABBREVIATION_DUPLICATES_EXIST');
    expect(migration).toContain('abbreviation_normalized');
    expect(migration).toContain('UX_exam_catalog_group_abbreviation');
  });
});
