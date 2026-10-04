import { readFileSync } from 'node:fs';

const source = readFileSync('src/patients/patients.service.ts', 'utf8');
const start = source.indexOf('getPatientResultsEmailHistory');
const endCandidate = source.indexOf('\n  async ', start + 32);
const end = endCandidate >= 0 ? endCandidate : source.length;
const method = source.slice(start, end);

describe('Patient results email history query contract', () => {
  it('joins the physical patient_admissions table', () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(method).toContain('patient_admissions');
    expect(method).not.toContain("'patients'");
    expect(method).not.toContain('JOIN patients ');
  });

  it('preserves users joins and the requested date range filters', () => {
    expect(method).toContain("'users'");
    expect(method).toContain('dateFrom');
    expect(method).toContain('dateTo');
    expect(method).toContain('requested_at');
  });
});