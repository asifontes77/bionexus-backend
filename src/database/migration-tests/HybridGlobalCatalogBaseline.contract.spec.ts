import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Hybrid global catalog baseline foundation', () => {
  const source = readFileSync(join(process.cwd(), 'src/database/migrations/1790366400000-BioNexusBaseline.ts'), 'utf8');
  const tables = ["antibiotic", "list_germs", "parasiticforms", "sample_type", "tax", "banks", "currencies", "exam_group", "exam_catalog", "tariffs", "type_payment"];
  it('keeps one baseline and creates package entitlement', () => {
    expect(source).toContain('BN-HYBRID-CATALOG-BEGIN');
    expect(source).toContain('CREATE TABLE "laboratory_catalog_packages"');
    expect(source).toContain('PK_laboratory_catalog_packages');
    expect(source).toContain('CK_laboratory_catalog_packages_key');
  });
  it.each(tables)('adds native reversible override support to %s', (table) => {
    expect(source).toContain(`ALTER TABLE "${table}" ALTER COLUMN "laboratory_id" DROP NOT NULL`);
    expect(source).toContain(`ALTER TABLE "${table}" ADD COLUMN "source_global_id" integer NULL`);
    expect(source).toContain(`ALTER TABLE "${table}" ADD COLUMN "is_platform_managed" boolean NOT NULL DEFAULT false`);
    expect(source).toContain(`UQ_${table}_laboratory_source_global`);
    expect(source).toContain(`TR_${table}_validate_hybrid_source`);
  });
  it('preserves tenant-only price and child relation scopes', () => {
    for (const table of ['payment_method_currencies', 'payment_method_fields']) {
      expect(source).not.toContain(`ALTER TABLE "${table}" ADD COLUMN "source_global_id"`);
    }
  });
});
