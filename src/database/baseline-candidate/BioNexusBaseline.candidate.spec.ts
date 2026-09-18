import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BioNexusBaselineCandidate } from './BioNexusBaseline.candidate';

describe('BioNexusBaselineCandidate', () => {
  it('permanece aislado fuera de database/migrations', () => {
    expect(__dirname.replace(/\\/g, '/')).toContain('/database/baseline-candidate');
    expect(__dirname.replace(/\\/g, '/')).not.toMatch(/\/database\/migrations$/);
  });

  it('ejecuta secuencialmente el SQL aprobado con el runner controlado', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const sql = readFileSync(join(__dirname, 'BioNexusBaseline.sql'), 'utf8');
    await new BioNexusBaselineCandidate().up({ query } as never);
    expect(query.mock.calls.length).toBeGreaterThan(45);
    expect(query.mock.calls.some(([value]) => /CREATE TABLE `users`/.test(String(value)))).toBe(true);
    expect(query.mock.calls.some(([value]) => /CREATE.*TRIGGER/i.test(String(value)))).toBe(true);
    expect(query.mock.calls.every(([value]) => !/^\s*DELIMITER/i.test(String(value)))).toBe(true);
  });

  it('bloquea un down destructivo no aprobado', async () => {
    await expect(new BioNexusBaselineCandidate().down()).rejects.toThrow(
      'BIONEXUS_BASELINE_DOWN_NOT_AVAILABLE',
    );
  });
});