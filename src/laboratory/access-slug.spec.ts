import { normalizeLaboratoryAccessSlug } from './access-slug';

describe('laboratory access slug', () => {
  it('normalizes whitespace and case into a DNS-safe stable slug', () => {
    expect(normalizeLaboratoryAccessSlug('  Lab A  ')).toBe('lab-a');
    expect(normalizeLaboratoryAccessSlug('NORTE-01')).toBe('norte-01');
  });

  it('rejects empty, non-ASCII, malformed, and overlong slugs', () => {
    expect(normalizeLaboratoryAccessSlug('')).toBeNull();
    expect(normalizeLaboratoryAccessSlug('laboratório')).toBeNull();
    expect(normalizeLaboratoryAccessSlug('-lab')).toBeNull();
    expect(normalizeLaboratoryAccessSlug('lab--a')).toBeNull();
    expect(normalizeLaboratoryAccessSlug('a'.repeat(64))).toBeNull();
  });

  it.each(['www', 'api', 'admin'])('rejects the reserved slug %s case-insensitively', (slug) => {
    expect(normalizeLaboratoryAccessSlug(slug)).toBeNull();
    expect(normalizeLaboratoryAccessSlug(slug.toUpperCase())).toBeNull();
  });
});
