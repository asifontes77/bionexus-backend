import { normalizeLaboratoryAccessSlug } from '../laboratory/access-slug';

export function resolveTenantSlugFromHostname(
  hostname: unknown,
  tenantDomain = process.env.BIONEXUS_TENANT_DOMAIN ?? 'bionexus.app',
): string | null {
  if (typeof hostname !== 'string' || typeof tenantDomain !== 'string') return null;

  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  const domain = tenantDomain.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!host || !domain || !host.endsWith(`.${domain}`)) return null;

  const subdomain = host.slice(0, -(domain.length + 1));
  if (subdomain.includes('.')) return null;

  return normalizeLaboratoryAccessSlug(subdomain);
}
