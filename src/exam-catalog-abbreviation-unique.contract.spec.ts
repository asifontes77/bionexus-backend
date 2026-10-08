import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const read=(path:string)=>readFileSync(path,'utf8');
const readBaselineSql=()=>{
  const source=read('src/database/migrations/1790366400000-BioNexusBaseline.ts');
  const match=source.match(/const BASELINE_GZIP_BASE64 = '([^']+)'/);
  if(!match) throw new Error('BIO_NEXUS_BASELINE_PAYLOAD_NOT_FOUND');
  return gunzipSync(Buffer.from(match[1],'base64')).toString('utf8');
};
describe('Exam catalog abbreviation uniqueness',()=>{
  const service=read('src/exam_lists/examlists.service.ts');
  const migration=readBaselineSql();
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
  it('protects persistence in the single installation baseline',()=>{
    expect(migration).toContain('abbreviation_normalized');
    expect(migration).toContain('UX_exam_catalog_group_abbreviation');
  });
});
