import { readFileSync } from 'node:fs';

describe('Parasitic forms hybrid uniqueness contract', () => {
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  const legacyConstraint = 'UQ_e0cb95e9137751fd9bfe6573be3';
  const physicalDrop = `ALTER TABLE "parasiticforms" DROP CONSTRAINT IF EXISTS "${legacyConstraint}"`;

  it('drops the physical legacy uniqueness constraint without recreating it', () => {
    expect(baseline).toContain(physicalDrop);
    expect(baseline).not.toContain(`ADD CONSTRAINT "${legacyConstraint}"`);
  });

  it('allows the same normalized description across global and tenant scopes', () => {
    expect(baseline).toContain('CREATE UNIQUE INDEX "UQ_parasiticforms_global_description"');
    expect(baseline).toContain('ON "parasiticforms" (lower(btrim("description"))) WHERE "laboratory_id" IS NULL');
    expect(baseline).toContain('CREATE UNIQUE INDEX "UQ_parasiticforms_tenant_description"');
    expect(baseline).toContain('ON "parasiticforms" ("laboratory_id", lower(btrim("description"))) WHERE "laboratory_id" IS NOT NULL');
  });

  it('orders the physical drop before both scoped indexes', () => {
    const dropPosition = baseline.indexOf(physicalDrop);
    const globalPosition = baseline.indexOf('CREATE UNIQUE INDEX "UQ_parasiticforms_global_description"');
    const tenantPosition = baseline.indexOf('CREATE UNIQUE INDEX "UQ_parasiticforms_tenant_description"');
    expect(dropPosition).toBeGreaterThanOrEqual(0);
    expect(dropPosition).toBeLessThan(globalPosition);
    expect(globalPosition).toBeLessThan(tenantPosition);
  });
});
