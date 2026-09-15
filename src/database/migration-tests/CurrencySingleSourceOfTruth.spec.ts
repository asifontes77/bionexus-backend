import { readFileSync } from 'node:fs';
import { CurrencySingleSourceOfTruth1789258800000 } from '../migrations/1789258800000-CurrencySingleSourceOfTruth';

describe('CurrencySingleSourceOfTruth1789258800000', () => {
  const source = readFileSync('src/database/migrations/1789258800000-CurrencySingleSourceOfTruth.ts', 'utf8');

  it('declares one relational source for application settings and tariffs', () => {
    for (const token of [
      'financial_primary_currency_id',
      'FK_application_settings_financial_primary_currency',
      'tariffs ADD currency_id',
      'FK_tariffs_currency',
      'REFERENCES currencies(id)',
    ]) expect(source).toContain(token);
  });

  it('preserves regional separator and removes duplicated presentation columns', () => {
    expect(source).toContain('AFTER decimal_separator');
    for (const column of [
      'currency_symbol',
      'currency_symbol_position',
      'base_currency_symbol',
      'base_currency_symbol_position',
      'monetary_decimals',
    ]) expect(source).toContain(`DROP COLUMN ${column}`);
    expect(source).not.toContain('DROP COLUMN decimal_separator');
  });

  it('copies current visible values before removing duplicate columns', () => {
    expect(source).toContain('currency.symbol_position = settings.currency_symbol_position');
    expect(source).toContain('currency.decimal_places = settings.monetary_decimals');
    expect(source).toContain('currency.symbol = settings.base_currency_symbol');
  });

  it('validates role counts and unresolved tariffs', () => {
    expect(source).toContain('CURRENCY_SINGLE_SOURCE_ROLE_COUNT_INVALID');
    expect(source).toContain('CURRENCY_SINGLE_SOURCE_TARIFF_UNRESOLVED');
  });

  it('is reversible', async () => {
    const query = jest.fn().mockResolvedValue([{ local_count: 1, base_count: 1, total: 0 }]);
    const runner = { query } as never;
    const migration = new CurrencySingleSourceOfTruth1789258800000();
    await migration.down(runner);
    const sql = query.mock.calls.flat().join('\n');
    expect(sql).toContain('ADD currency_code');
    expect(sql).toContain('DROP COLUMN financial_primary_currency_id');
    expect(sql).toContain('DROP COLUMN currency_id');
  });
});