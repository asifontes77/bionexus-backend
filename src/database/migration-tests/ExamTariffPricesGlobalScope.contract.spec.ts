import { readFileSync } from 'node:fs';

describe('Exam tariff prices global scope contract',()=>{
 const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
 it('allows laboratory_id null for the global platform template',()=>{
  expect(baseline).toContain('ALTER TABLE "exam_tariff_prices" ALTER COLUMN "laboratory_id" DROP NOT NULL');
  expect(baseline).toContain('CK_exam_tariff_prices_hybrid_scope');
  expect(baseline).toContain('"laboratory_id" IS NULL AND "is_platform_managed" = true');
 });
 it('still requires laboratory scope and source identity for adopted tenant rows',()=>{
  expect(baseline).toContain('"laboratory_id" IS NOT NULL AND "is_platform_managed" = true AND "source_global_id" IS NOT NULL');
 });
});
