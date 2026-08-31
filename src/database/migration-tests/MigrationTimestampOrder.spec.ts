import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Migration timestamp order', () => {
  const directory = join(process.cwd(), 'src/database/migrations');
  const files = readdirSync(directory).filter((file) => file.endsWith('.ts')).sort();

  it('usa exclusivamente timestamps JavaScript de 13 digitos', () => {
    expect(files).toHaveLength(15);
    for (const file of files) expect(file).toMatch(/^\d{13}-/);
  });

  it('mantiene orden ascendente y ejecuta InitialSchema antes de los triggers', () => {
    const timestamps = files.map((file) => Number(file.slice(0, 13)));
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(files.findIndex((file) => file.includes('InitialSchema')))
      .toBeLessThan(files.findIndex((file) => file.includes('updated-at-triggers')));
  });

  it('alinea el sufijo de cada clase con su archivo', () => {
    for (const file of files) {
      const timestamp = file.slice(0, 13);
      const source = readFileSync(join(directory, file), 'utf8');
      expect(source).toMatch(new RegExp(`export\\s+class\\s+\\w+${timestamp}\\s+implements\\s+MigrationInterface`));
    }
  });
});
