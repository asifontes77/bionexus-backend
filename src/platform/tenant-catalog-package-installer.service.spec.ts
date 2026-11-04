import { TenantCatalogPackageInstallerService } from './tenant-catalog-package-installer.service';

describe('TenantCatalogPackageInstallerService', () => {
  it('installs the granular dependency closure in order and preserves tariffs as one unit', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT id,catalog_release_id')) return [];
      if (sql.includes('information_schema.columns')) return [];
      if (sql.includes('INSERT INTO laboratory_catalog_packages')) {
        return [{ packageCode: 'installed' }];
      }
      return [];
    });
    const manager = { query };
    const getLatestCompatible = jest.fn(async (packageCode: string) => ({
      id: packageCode,
      version: '1.0.0',
      checksum: 'A'.repeat(64),
    }));
    const installer = new TenantCatalogPackageInstallerService({ getLatestCompatible } as never);

    await installer.installSelected(manager as never, 42, ['tariffs'], 7001);

    expect(getLatestCompatible.mock.calls.map(([packageCode]) => packageCode)).toEqual([
      'currencies','exam-groups','sample-types','taxes','exams','tariffs',
    ]);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('FROM "exam_tariff_prices" template'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('FROM "special_test_items" template'))).toBe(false);
  });

  it('rejects packages without approved data before looking up releases', async () => {
    const query = jest.fn();
    const getLatestCompatible = jest.fn();
    const installer = new TenantCatalogPackageInstallerService({ getLatestCompatible } as never);

    await expect(installer.installSelected({ query } as never, 42, ['special-tests'], 7001))
      .rejects.toThrow('PLATFORM_PROVISIONING_SEED_PACKAGE_UNKNOWN');
    expect(getLatestCompatible).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
