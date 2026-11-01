import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Approved catalog snapshots contract', () => {
  const root = resolve('src/database/seed-data/releases/1.0.0');
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));

  it('contains six global packages and excludes tenant-owned special tests', () => {
    expect(manifest.packages).toHaveLength(6);
    expect(manifest.excludedTenantOwnedTables).toEqual(['special_test_items', 'special_test_lab']);
  });

  it('preserves checksums for every immutable package payload', () => {
    const stable = (value: unknown): string => {
      if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
      if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
      }
      return JSON.stringify(value);
    };
    for (const item of manifest.packages) {
      const document = JSON.parse(readFileSync(resolve(root, item.file), 'utf8'));
      const { checksum, ...payload } = document;
      const calculated = createHash('sha256').update(stable(payload), 'utf8').digest('hex').toUpperCase();
      expect(checksum).toBe(item.checksum);
      expect(calculated).toBe(item.checksum);
      expect(checksum).toMatch(/^[A-F0-9]{64}$/);
      expect(item.totalRows).toBeGreaterThan(0);
    }
  });

  it('contains exactly the twelve approved global table identities', () => {
    const tables = manifest.packages.flatMap((item: { tables: Record<string, number> }) => Object.keys(item.tables)).sort();
    expect(tables).toEqual(['antibiotic','banks','currencies','exam_catalog','exam_group','exam_tariff_prices','list_germs','parasiticforms','sample_type','tariffs','tax','type_payment'].sort());
  });
});
