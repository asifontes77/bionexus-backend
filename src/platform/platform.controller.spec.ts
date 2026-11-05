import { PlatformController } from './platform.controller';

describe('PlatformController laboratory listing', () => {
  it('returns catalog package counts separately from enabled application modules', async () => {
    const rows = [{
      id: 3,
      branchCount: 1,
      moduleCount: 0,
      catalogPackageCount: 11,
    }];
    const query = jest.fn().mockResolvedValue(rows);
    const controller = new PlatformController({ query } as never, {} as never, {} as never);

    await expect(controller.laboratories()).resolves.toBe(rows);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('FROM laboratory_modules m WHERE m.laboratory_id=l.id AND m.is_enabled=true) AS "moduleCount"');
    expect(sql).toContain('FROM laboratory_catalog_packages cp WHERE cp.laboratory_id=l.id) AS "catalogPackageCount"');
  });

  it('exposes detail, package, branch, and owner-reauthenticated delete APIs through the admin service', async () => {
    const admin = {
      getLaboratory: jest.fn().mockResolvedValue({ access: { slug: 'lab-a' } }),
      listPackages: jest.fn().mockResolvedValue({ installed: [], available: [] }),
      listBranches: jest.fn().mockResolvedValue([]),
      deleteLaboratory: jest.fn().mockResolvedValue({ deleted: true }),
    };
    const controller = new PlatformController({ query: jest.fn() } as never, {} as never, admin as never);

    await expect(controller.getLaboratory('4')).resolves.toEqual({ access: { slug: 'lab-a' } });
    await expect(controller.listPackages('4')).resolves.toEqual({ installed: [], available: [] });
    await expect(controller.listBranches('4')).resolves.toEqual([]);
    await expect(controller.deleteLaboratory('4', { password: 'secret' }, {
      user: { identityType: 'platform-owner', userId: 70 },
    })).resolves.toEqual({ deleted: true });
    expect(admin.deleteLaboratory).toHaveBeenCalledWith(4, 70, 'secret');
  });
});
