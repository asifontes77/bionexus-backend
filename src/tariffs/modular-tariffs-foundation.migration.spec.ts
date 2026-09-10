import { QueryRunner } from 'typeorm';
import { ModularTariffsFoundation1788998400000 } from '../database/migrations/1788998400000-ModularTariffsFoundation';

describe('ModularTariffsFoundation1788998400000', () => {
  it('declares creation, migration, validation, constraints and reversible down', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('WHERE tariff IS NULL OR tariff < 1 OR tariff > 6')) {
        return [{ total: 0 }];
      }
      if (sql.includes('(SELECT COUNT(*) FROM tariffs) AS tariff_count')) {
        return [
          {
            tariff_count: 6,
            exam_count: 2,
            price_count: 12,
            client_count: 2,
            linked_client_count: 2,
          },
        ];
      }
      if (sql.includes('SELECT COUNT(*) AS differences')) {
        return [{ differences: 0 }];
      }
      return undefined;
    });

    const migration = new ModularTariffsFoundation1788998400000();
    await migration.up({ query } as unknown as QueryRunner);

    const upSql = query.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(upSql).toContain('CREATE TABLE tariffs');
    expect(upSql).toContain('CREATE TABLE exam_tariff_prices');
    expect(upSql).toContain('ALTER TABLE client ADD COLUMN tariff_id');
    expect(upSql).toContain('FK_client_tariff_id');
    expect(upSql).not.toContain('DROP COLUMN tariff');

    query.mockClear();
    await migration.down({ query } as unknown as QueryRunner);

    const downSql = query.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(downSql).toContain('DROP FOREIGN KEY FK_client_tariff_id');
    expect(downSql).toContain('ALTER TABLE client DROP COLUMN tariff_id');
    expect(downSql).toContain('DROP TABLE exam_tariff_prices');
    expect(downSql).toContain('DROP TABLE tariffs');
  });
});
