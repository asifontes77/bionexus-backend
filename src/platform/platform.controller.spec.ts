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
    const controller = new PlatformController({ query } as never, {} as never);

    await expect(controller.laboratories()).resolves.toBe(rows);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('FROM laboratory_modules m WHERE m.laboratory_id=l.id AND m.is_enabled=true) AS "moduleCount"');
    expect(sql).toContain('FROM laboratory_catalog_packages cp WHERE cp.laboratory_id=l.id) AS "catalogPackageCount"');
  });
});
