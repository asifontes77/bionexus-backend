import { readFileSync } from 'node:fs';

describe('Hybrid catalog scope contract', () => {
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  const expected = ['antibiotic','list_germs','parasiticforms','sample_type','exam_group','exam_catalog','currencies','tax','tariffs','banks','type_payment','exam_tariff_prices'].sort();
  const constraints = [...baseline.matchAll(/ALTER TABLE "([^"]+)" ADD CONSTRAINT "CK_[^"]+_hybrid_scope" CHECK \(([\s\S]*?)\)`\);/g)];

  it('defines one hybrid scope constraint for each approved shared catalog', () => {
    expect(constraints.map(match => match[1]).sort()).toEqual(expected);
  });
  it('allows global platform-managed rows', () => {
    for (const match of constraints) expect(match[2]).toContain('"laboratory_id" IS NULL AND "is_platform_managed" = true');
  });
  it('requires source identity for adopted tenant rows', () => {
    for (const match of constraints) expect(match[2]).toContain('"laboratory_id" IS NOT NULL AND "is_platform_managed" = true AND "source_global_id" IS NOT NULL');
  });
  it('allows tenant-local rows only without source identity', () => {
    for (const match of constraints) expect(match[2]).toContain('"laboratory_id" IS NOT NULL AND "is_platform_managed" = false AND "source_global_id" IS NULL');
  });
});
