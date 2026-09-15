import { QueryRunner } from 'typeorm';
import { SpecialTestLabFieldLengths1789489200000 } from '../migrations/1789489200000-SpecialTestLabFieldLengths';

describe('SpecialTestLabFieldLengths1789489200000', () => {
  it('amplia solamente los cuatro campos aprobados', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new SpecialTestLabFieldLengths1789489200000().up({ query } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('`description` varchar(60) NOT NULL');
    expect(sql).toContain('`address` varchar(255) NOT NULL');
    expect(sql).toContain('`phone_1` varchar(30) NOT NULL');
    expect(sql).toContain('`phone_2` varchar(30) NOT NULL');
    expect(sql).not.toContain('DROP');
    expect(sql).not.toContain('DELETE');
    expect(sql).not.toContain('UPDATE');
  });

  it('incluye reversa explicita al contrato anterior', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new SpecialTestLabFieldLengths1789489200000().down({ query } as unknown as QueryRunner);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('`description` char(40) NOT NULL');
    expect(sql).toContain('`address` varchar(200) NOT NULL');
    expect(sql).toContain('`phone_1` char(20) NOT NULL');
    expect(sql).toContain('`phone_2` char(20) NOT NULL');
  });
});
