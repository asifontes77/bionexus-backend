import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Approved seed data contract', () => {
  const source = readFileSync(resolve('src/database/seed-data/approved-catalog-seed.json'));
  const serialized = source.toString('utf8').toLowerCase();

  it('preserves the approved immutable source', () => {
    expect(createHash('sha256').update(source).digest('hex').toUpperCase()).toBe('A1B2041B1028D8914CD3020DD41BAE1932CD69CCC0C9E1A3A9D3ED729BE2C878');
  });

  it('documents all fourteen approved table identities', () => {
    for (const table of ['antibiotic','list_germs','parasiticforms','sample_type','exam_group','exam_catalog','special_test_lab','special_test_items','currencies','tax','tariffs','banks','type_payment','exam_tariff_prices']) {
      expect(serialized).toContain(table);
    }
  });
});
