import { readFileSync } from 'node:fs';

describe('Seed relation contract', () => {
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  const migration = readFileSync(`${process.cwd()}/src/database/migrations/1790366400000-BioNexusBaseline.ts`, 'utf8');
  const examCatalog = JSON.parse(readFileSync('src/database/seed-data/releases/1.0.0/exam-catalog.json', 'utf8'));
  const financial = JSON.parse(readFileSync('src/database/seed-data/releases/1.0.0/financial-and-payments.json', 'utf8'));
  const tariffs = JSON.parse(readFileSync('src/database/seed-data/releases/1.0.0/tariffs.json', 'utf8'));

  it('keeps the approved relation names exactly as exported', () => {
    expect(examCatalog.tables.exam_catalog[0]).toHaveProperty('group_id');
    expect(examCatalog.tables.exam_catalog[0]).toHaveProperty('tax_id');
    expect(examCatalog.tables.exam_catalog[0]).not.toHaveProperty('sample_type_id');
    expect(financial.tables.type_payment[0]).not.toHaveProperty('currency_id');
    expect(tariffs.tables.tariffs[0]).toHaveProperty('currency_id');
    expect(tariffs.tables.exam_tariff_prices[0]).toHaveProperty('tariff_id');
    expect(tariffs.tables.exam_tariff_prices[0]).toHaveProperty('exam_catalog_id');
  });

  it('keeps every exam_tariff_prices hybrid element exactly once', () => {
    for (const token of [
      'ALTER TABLE "exam_tariff_prices" ADD COLUMN "laboratory_id"',
      'ALTER TABLE "exam_tariff_prices" ADD COLUMN "source_global_id"',
      'ALTER TABLE "exam_tariff_prices" ADD COLUMN "is_platform_managed"',
      'FK_exam_tariff_prices_laboratory',
      'CK_exam_tariff_prices_hybrid_scope',
      'UQ_exam_tariff_prices_global_source',
      'UQ_exam_tariff_prices_tenant_source',
    ]) expect(migration.split(token).length - 1).toBe(1);
  });
});
