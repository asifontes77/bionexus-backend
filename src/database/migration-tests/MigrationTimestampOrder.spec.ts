import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Migration timestamp order', () => {
  const directory = join(__dirname, '../migrations');
  const files = readdirSync(directory)
    .filter((file) => /^\d+-.*\.ts$/.test(file))
    .sort();

  it('mantiene exclusivamente el baseline inicial', () => {
    expect(files).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });

  it('alinea el sufijo de la clase con su archivo', () => {
    const source = readFileSync(join(directory, files[0]), 'utf8');
    expect(source).toContain('BioNexusBaseline1790366400000');
  });
});