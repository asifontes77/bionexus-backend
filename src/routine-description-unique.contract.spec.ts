import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
describe('Routine description uniqueness',()=>{
 const service=readFileSync('src/routines/routines.service.ts','utf8');
 const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
 const payload=/const BASELINE_GZIP_BASE64 = '([^']+)'/.exec(baseline)?.[1] ?? '';
 const schema=gunzipSync(Buffer.from(payload,'base64')).toString('utf8');
 it('validates create and update',()=>{ expect(service).toContain('ensureDescriptionAvailable'); expect(service).toContain('ROUTINE_DESCRIPTION_ALREADY_EXISTS'); expect(service).toContain('excludedId'); });
 it('maps concurrent duplicates',()=>{ expect(service).toContain('ER_DUP_ENTRY'); expect(service).toContain('UX_exam_routines_description'); });
 it('consolidates persistence protection in the baseline',()=>{ expect(schema).toContain('description_normalized'); expect(schema).toContain('UX_exam_routines_description'); expect(schema).toContain('UPPER(TRIM'); expect(schema).toContain('is_active'); });
});
