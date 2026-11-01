import { readFileSync } from 'node:fs';

describe('Tariffs hybrid uniqueness contract',()=>{
 const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
 const legacyConstraint='UQ_257274cc44e534b2d870962842a';
 const physicalDrop=`ALTER TABLE "tariffs" DROP CONSTRAINT IF EXISTS "${legacyConstraint}"`;
 it('drops the physical global code constraint without recreating it',()=>{
  expect(baseline).toContain(physicalDrop);
  expect(baseline).not.toContain(`ADD CONSTRAINT "${legacyConstraint}"`);
 });
 it('keeps normalized code uniqueness in global scope and inside each tenant',()=>{
  expect(baseline).toContain('CREATE UNIQUE INDEX "UQ_tariffs_global_code"');
  expect(baseline).toContain('ON "tariffs" (upper(btrim("code"))) WHERE "laboratory_id" IS NULL');
  expect(baseline).toContain('CREATE UNIQUE INDEX "UQ_tariffs_tenant_code"');
  expect(baseline).toContain('ON "tariffs" ("laboratory_id", upper(btrim("code"))) WHERE "laboratory_id" IS NOT NULL');
 });
 it('drops the physical constraint before creating both scoped indexes',()=>{
  const drop=baseline.indexOf(physicalDrop);
  const globalIndex=baseline.indexOf('CREATE UNIQUE INDEX "UQ_tariffs_global_code"');
  const tenantIndex=baseline.indexOf('CREATE UNIQUE INDEX "UQ_tariffs_tenant_code"');
  expect(drop).toBeGreaterThanOrEqual(0);
  expect(drop).toBeLessThan(globalIndex);
  expect(globalIndex).toBeLessThan(tenantIndex);
 });
});
