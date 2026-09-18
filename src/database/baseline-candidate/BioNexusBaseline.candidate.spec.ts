import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BioNexusBaselineCandidate } from './BioNexusBaseline.candidate';

describe('BioNexusBaselineCandidate', () => {
  it('permanece aislado fuera de database/migrations', () => {
    expect(__dirname.replace(/\\/g, '/')).toContain('/database/baseline-candidate');
    expect(__dirname.replace(/\\/g, '/')).not.toMatch(/\/database\/migrations$/);
  });

  it('delega al QueryRunner el SQL aprobado sin transformarlo', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const sql = readFileSync(join(__dirname, 'BioNexusBaseline.sql'), 'utf8');
    await new BioNexusBaselineCandidate().up({ query } as never);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(sql);
  });

  it('bloquea un down destructivo no aprobado', async () => {
    await expect(new BioNexusBaselineCandidate().down()).rejects.toThrow(
      'BIONEXUS_BASELINE_DOWN_NOT_AVAILABLE',
    );
  });
});