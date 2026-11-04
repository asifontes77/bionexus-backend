import { PlatformProvisioningService } from './platform-provisioning.service';

describe('PlatformProvisioningService', () => {
  it('uses one serializable transaction and installs the required tenant data', async () => {
    const query = jest.fn(async (sql: string) => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      const lower = normalized.toLowerCase();
      if (lower.includes('pg_advisory_xact_lock')) return undefined;
      if (lower.includes('select exists(select 1 from laboratory') && lower.includes('username')) return [{ rif: false, username: false }];
      if (lower.startsWith('insert into laboratory (')) return [{ id: 1, rif: 'J-12345678-9', name: 'Lab' }];
      if (lower.startsWith('insert into laboratory_branches')) return [{ id: 2, code: 'MAIN', name: 'Principal' }];
      if (lower.includes('from information_schema.columns')) return [{ column_name: 'code', is_identity: 'NO' }];
      if (lower.startsWith('insert into "')) return undefined;
      if (lower.startsWith('select id from currencies')) return [{ id: 3 }];
      if (lower.startsWith('insert into application_settings')) return undefined;
      if (lower.startsWith('insert into security_roles')) return [{ id: 4 }];
      if (lower.startsWith('insert into security_role_permissions')) return undefined;
      if (lower.startsWith('insert into users')) return [{ id: 5, name: 'Admin', username: 'admin' }];
      if (lower.startsWith('insert into security_user_roles')) return undefined;
      throw new Error(`UNEXPECTED_SQL: ${normalized}`);
    });
    const manager = { query };
    const dataSource = { transaction: jest.fn(async (_level, work) => work(manager)) };
    const installSelected = jest.fn().mockResolvedValue([]);
    const service = new PlatformProvisioningService(dataSource as never, { installSelected } as never);
    await expect(service.provision({
      rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      branchCode: 'MAIN', branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Strong!Pass123', seedPackages: [],
    }, 7001)).resolves.toEqual(expect.objectContaining({ laboratory: expect.objectContaining({ id: 1 }), mainBranch: expect.objectContaining({ id: 2 }) }));
    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    expect(installSelected).toHaveBeenCalledWith(manager, 1, ['currencies'], 7001);
    expect(query.mock.calls.some(call => String(call[0]).includes('laboratory_branches'))).toBe(true);
    expect(query.mock.calls.some(call => String(call[0]).includes('request_password'))).toBe(true);
    expect(query.mock.calls.find(call => String(call[0]).toLowerCase().startsWith('select id from currencies'))?.[0])
      .toContain("upper(btrim(code))='VES' AND is_active=true");
  });

  it('rejects a mismatched confirmation before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = new PlatformProvisioningService(dataSource as never, { installSelected: jest.fn().mockResolvedValue([]) } as never);
    await expect(service.provision({
      rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      branchCode: 'MAIN', branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Different!Pass123', seedPackages: [],
    } as never, 7001)).rejects.toThrow('PLATFORM_PROVISIONING_PASSWORD_CONFIRMATION_MISMATCH');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  }, 7001);

  it('rejects packages without approved snapshots before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = new PlatformProvisioningService(dataSource as never, { installSelected: jest.fn() } as never);
    await expect(service.provision({
      rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      branchCode: 'MAIN', branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Strong!Pass123',
      seedPackages: ['special-tests'],
    }, 7001)).rejects.toThrow('PLATFORM_PROVISIONING_SEED_PACKAGE_UNKNOWN');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
