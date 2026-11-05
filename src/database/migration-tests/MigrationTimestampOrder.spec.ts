import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Migration timestamp order', () => {
  const directory = join(__dirname, '../migrations');
  const files = readdirSync(directory)
    .filter((file) => /^\d+-.*\.ts$/.test(file))
    .sort();

  it('mantiene exclusivamente el baseline inicial', () => {
    expect(files).toEqual([
      '1790366400000-BioNexusBaseline.ts',
      '1793847600000-AddPlatformLaboratoryLifecycle.ts',
      '1793862000000-AddPlatformSubscriptionCatalogAndBilling.ts',
    ]);
  });

  it('alinea el sufijo de cada clase con su archivo', () => {
    const classNames = [
      'BioNexusBaseline1790366400000',
      'AddPlatformLaboratoryLifecycle1793847600000',
      'AddPlatformSubscriptionCatalogAndBilling1793862000000',
    ];
    for (const [index, className] of classNames.entries()) {
      const source = readFileSync(join(directory, files[index]), 'utf8');
      expect(source).toContain(className);
    }
  });
});