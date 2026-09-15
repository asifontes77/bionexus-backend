import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Modular tariffs foundation contract', () => {
  const migration = read(
    'src/database/migrations/1788998400000-ModularTariffsFoundation.ts',
  );
  const tariff = read('src/tariffs/tariff.entity.ts');
  const price = read('src/tariffs/exam-tariff-price.entity.ts');
  const client = read('src/client/client.entity.ts');

  it('creates normalized unlimited tariff tables without dropping legacy columns', () => {
    expect(migration).toContain('CREATE TABLE tariffs');
    expect(migration).toContain('CREATE TABLE exam_tariff_prices');
    expect(migration).toContain('UQ_exam_tariff_prices_exam_tariff');
    expect(migration).not.toContain('DROP COLUMN cost1');
    const upSection = migration.split('public async down')[0];

    expect(upSection).not.toContain('DROP COLUMN tariff');

    expect(migration).toContain('ALTER TABLE client DROP COLUMN tariff_id');
  });

  it('migrates six legacy prices dynamically and validates exact preservation', () => {
    expect(migration).toContain("'LEGACY_1'");
    expect(migration).toContain("'LEGACY_6'");
    expect(migration).toContain('Number(row.exam_count) * 6');
    expect(migration).toContain('MODULAR_TARIFFS_PRICE_PRESERVATION_FAILED');
  });

  it('keeps USD as price currency and uses restrictive relations', () => {
    expect(tariff).toContain("name: 'currency_id'");expect(tariff).toContain('currency: Currency');
    expect(price).toContain("onDelete: 'RESTRICT'");
    expect(price).toContain("onUpdate: 'RESTRICT'");
    expect(client).toContain("name: 'tariff_id'");
    expect(client).toContain('tariffRelation: Tariff | null;');
  });

  it('provides a reversible down path while preserving legacy sources', () => {
    expect(migration).toContain('DROP TABLE exam_tariff_prices');
    expect(migration).toContain('DROP TABLE tariffs');
    expect(migration).toContain('ALTER TABLE client DROP COLUMN tariff_id');
  });
});
