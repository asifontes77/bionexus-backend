import { readFileSync } from 'node:fs';

describe('Parasitic forms physical constraint contract',()=>{
 const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
 const drop='ALTER TABLE "parasiticforms" DROP CONSTRAINT IF EXISTS "UQ_e0cb95e9137751fd9bfe6573be3"';
 const globalIndex='CREATE UNIQUE INDEX "UQ_parasiticforms_global_description"';
 const tenantIndex='CREATE UNIQUE INDEX "UQ_parasiticforms_tenant_description"';
 it('drops the physical legacy unique constraint before scoped indexes',()=>{
  expect(baseline).toContain(drop);
  expect(baseline.indexOf(drop)).toBeLessThan(baseline.indexOf(globalIndex));
  expect(baseline.indexOf(globalIndex)).toBeLessThan(baseline.indexOf(tenantIndex));
 });
 it('keeps exactly one physical drop and one index per scope',()=>{
  expect(baseline.split(drop).length-1).toBe(1);
  expect(baseline.split(globalIndex).length-1).toBe(1);
  expect(baseline.split(tenantIndex).length-1).toBe(1);
 });
});
