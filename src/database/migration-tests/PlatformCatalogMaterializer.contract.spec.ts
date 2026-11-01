import { readFileSync } from 'node:fs';

describe('Platform catalog materializer contract', () => {
  const service = readFileSync('src/platform/platform-catalog-materializer.service.ts', 'utf8');
  const module = readFileSync('src/platform/platform.module.ts', 'utf8');

  it('materializes only the twelve approved shared catalog tables', () => {
    for (const table of ['antibiotic','list_germs','parasiticforms','sample_type','exam_group','exam_catalog','currencies','tax','tariffs','banks','type_payment','exam_tariff_prices']) expect(service).toContain(`'${table}'`);
    expect(service).not.toContain("'special_test_lab'");
    expect(service).not.toContain("'special_test_items'");
  });

  it('keeps catalogs at laboratory scope and never branch scope', () => {
    expect(service).toContain('row.laboratory_id = null');
    expect(service).toContain("column === 'laboratory_branch_id'");
    expect(service).not.toContain('row.laboratory_branch_id');
  });

  it('remaps the five approved relations before inserting dependent rows', () => {
    for (const token of ['exam_catalog.group_id','exam_catalog.tax_id','tariffs.currency_id','exam_tariff_prices.tariff_id','exam_tariff_prices.exam_catalog_id']) expect(service).toContain(token);
  });

  it('is idempotent by table and source_global_id and is registered for reuse', () => {
    expect(service).toContain('laboratory_id IS NULL AND source_global_id=$1');
    expect(module).toContain('PlatformCatalogMaterializerService');
  });
});
