import * as fs from 'node:fs';
import * as path from 'node:path';

describe('DollarValue manual publication contract', () => {
  const root = path.resolve(__dirname, '../..');
  const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

  it('accepts only value and assigns UNKNOWN plus MANUAL on the server', () => {
    const dto = read('src/dollar_value/dto/create-dollarvalue.dto.ts');
    const service = read('src/dollar_value/dollarvalue.service.ts');
    expect(dto).toContain('value: number');
    expect(dto).not.toContain('source:');
    expect(service).toContain("source: 'UNKNOWN', updateMethod: 'MANUAL'");
    expect(service).toContain("field !== 'value'");
    expect(service).not.toContain('normalizeSource');
  });

  it('preserves independent source and update method fields', () => {
    const entity = read('src/dollar_value/dollarvalue.entity.ts');
    expect(entity).toContain("source: 'BCV' | 'DOLAR_API' | 'OTHER' | 'UNKNOWN'");
    expect(entity).toContain("updateMethod: 'AUTOMATIC' | 'MANUAL' | 'UNKNOWN'");
  });

  it('keeps exactly one baseline migration', () => {
    const migrations = fs.readdirSync(path.join(root, 'src/database/migrations')).filter((name) => name.endsWith('.ts'));
    expect(migrations).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });
});
