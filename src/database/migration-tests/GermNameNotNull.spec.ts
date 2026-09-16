import { QueryRunner } from 'typeorm';
import { GermNameNotNull1789496400000 } from '../migrations/1789496400000-GermNameNotNull';

describe('GermNameNotNull1789496400000', () => {
  it('convierte germen en obligatorio sin transformar datos', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new GermNameNotNull1789496400000().up({ query } as unknown as QueryRunner);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('`germen` varchar(50) NOT NULL');
    expect(sql).not.toContain('UPDATE');
    expect(sql).not.toContain('DELETE');
    expect(sql).not.toContain('DROP');
  });

  it('incluye reversa explicita a nullable', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new GermNameNotNull1789496400000().down({ query } as unknown as QueryRunner);
    expect(String(query.mock.calls[0][0])).toContain('`germen` varchar(50) NULL');
  });
});
