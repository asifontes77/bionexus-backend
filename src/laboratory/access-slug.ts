const RESERVED_LABORATORY_ACCESS_SLUGS = new Set(['www', 'api', 'admin']);

export function normalizeLaboratoryAccessSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  if (
    normalized.length === 0 ||
    normalized.length > 63 ||
    RESERVED_LABORATORY_ACCESS_SLUGS.has(normalized) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)
  ) {
    return null;
  }

  return normalized;
}
