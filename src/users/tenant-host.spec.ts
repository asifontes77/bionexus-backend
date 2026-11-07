import { resolveTenantSlugFromHostname } from './tenant-host';

describe('tenant hostname resolution', () => {
  const originalTenantDomain = process.env.BIONEXUS_TENANT_DOMAIN;

  beforeEach(() => {
    delete process.env.BIONEXUS_TENANT_DOMAIN;
  });

  afterAll(() => {
    if (originalTenantDomain === undefined) delete process.env.BIONEXUS_TENANT_DOMAIN;
    else process.env.BIONEXUS_TENANT_DOMAIN = originalTenantDomain;
  });

  it('resolves one configured tenant subdomain', () => {
    expect(resolveTenantSlugFromHostname('Lab-A.bionexus.app')).toBe('lab-a');
    expect(resolveTenantSlugFromHostname('lab-a.example.test', 'example.test')).toBe('lab-a');
  });

  it('does not infer a tenant from localhost, the base domain, or nested subdomains', () => {
    expect(resolveTenantSlugFromHostname('localhost')).toBeNull();
    expect(resolveTenantSlugFromHostname('bionexus.app')).toBeNull();
    expect(resolveTenantSlugFromHostname('nested.lab-a.bionexus.app')).toBeNull();
  });

  it.each(['www', 'api', 'admin'])('does not resolve reserved host %s as a tenant', (slug) => {
    expect(resolveTenantSlugFromHostname(`${slug}.bionexus.app`)).toBeNull();
  });
});
