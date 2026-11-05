import { PlatformProvisioningService } from './platform-provisioning.service';
import { PlatformLaboratoryAuditService } from './platform-laboratory-audit.service';

describe('PlatformProvisioningService', () => {
  it('uses one serializable transaction and installs the required tenant data', async () => {
    const branchInsertValues: unknown[][] = [];
    const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      const lower = normalized.toLowerCase();
      if (lower.includes('pg_advisory_xact_lock')) return undefined;
      if (lower.includes('select exists(select 1 from laboratory') && lower.includes('access_slug')) return [{ rif: false, access_slug: false }];
      if (lower.startsWith('insert into laboratory (')) return [{ id: 1, access_slug: 'lab-a', rif: 'J-12345678-9', name: 'Lab' }];
      if (lower.startsWith('insert into platform_subscriptions')) return undefined;
      if (lower.startsWith('insert into laboratory_branches')) {
        branchInsertValues.push(parameters ?? []);
        return [{ id: 2, code: 'PRINCIPAL', name: 'Principal' }];
      }
      if (lower.includes('from information_schema.columns')) return [{ column_name: 'code', is_identity: 'NO' }];
      if (lower.startsWith('insert into "')) return undefined;
      if (lower.startsWith('select id from currencies')) return [{ id: 3 }];
      if (lower.startsWith('insert into application_settings')) return undefined;
      if (lower.startsWith('insert into security_roles')) return [{ id: 4 }];
      if (lower.startsWith('insert into security_role_permissions')) return undefined;
      if (lower.startsWith('insert into users')) return [{ id: 5, name: 'Admin', username: 'admin' }];
      if (lower.startsWith('insert into security_user_roles')) return undefined;
      if (lower.startsWith('insert into platform_laboratory_audit_logs')) return undefined;
      throw new Error(`UNEXPECTED_SQL: ${normalized}`);
    });
    const manager = { query };
    const dataSource = { transaction: jest.fn(async (_level, work) => work(manager)) };
    const installSelected = jest.fn().mockResolvedValue([]);
    const service = new PlatformProvisioningService(
      dataSource as never,
      { installSelected } as never,
      new PlatformLaboratoryAuditService(),
    );
    await expect(service.provision({
      access_slug: ' Lab A ', rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      plan_code: 'pilot', subscription_status: 'perpetual_free' as const, service_starts_at: '2026-10-30T00:00:00Z',
      service_expires_at: null, perpetual_free_reason: 'Pilot grant',
      branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Strong!Pass123', seedPackages: [],
    }, 7001)).resolves.toEqual(expect.objectContaining({ laboratory: expect.objectContaining({ id: 1, access_slug: 'lab-a' }), mainBranch: expect.objectContaining({ id: 2, code: 'PRINCIPAL' }) }));
    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    expect(installSelected).toHaveBeenCalledWith(manager, 1, ['currencies'], 7001);
    expect(query.mock.calls.some(call => String(call[0]).includes('laboratory_branches'))).toBe(true);
    expect(branchInsertValues[0]).toContain('PRINCIPAL');
    expect(query.mock.calls.some(call => String(call[0]).includes('request_password'))).toBe(true);
    expect(query.mock.calls.find(call => String(call[0]).replace(/\s+/g, ' ').toLowerCase().startsWith('insert into laboratory ('))?.[0])
      .toContain('access_slug');
    const laboratoryInsert = query.mock.calls.find(call => String(call[0]).replace(/\s+/g, ' ').toLowerCase().startsWith('insert into laboratory ('));
    expect(laboratoryInsert?.[0]).not.toContain("$9='perpetual_free'");
    expect((String(laboratoryInsert?.[0]).match(/\$17\b/g) ?? [])).toHaveLength(1);
    expect(laboratoryInsert?.[1]?.[16]).toBe('perpetual_free');
    expect(query.mock.calls.some(call => String(call[0]).toLowerCase().startsWith('insert into platform_subscriptions'))).toBe(true);
    expect(query.mock.calls.find(call => String(call[0]).toLowerCase().startsWith('select id from currencies'))?.[0])
      .toContain("upper(btrim(code))='VES' AND is_active=true");
    const auditCall = query.mock.calls.find(call => String(call[0]).startsWith('INSERT INTO platform_laboratory_audit_logs'));
    expect(auditCall?.[1]).toEqual(expect.arrayContaining([1, 7001, 'platform.laboratory.created']));
    expect(String(auditCall?.[1]?.[4])).not.toContain('Strong!Pass123');
  });

  it('rejects a mismatched confirmation before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = new PlatformProvisioningService(dataSource as never, { installSelected: jest.fn().mockResolvedValue([]) } as never, new PlatformLaboratoryAuditService());
    await expect(service.provision({
      access_slug: 'lab-a', rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      plan_code: 'pilot', subscription_status: 'perpetual_free' as const, service_starts_at: '2026-10-30T00:00:00Z',
      service_expires_at: null, perpetual_free_reason: 'Pilot grant',
      branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Different!Pass123', seedPackages: [],
    } as never, 7001)).rejects.toThrow('PLATFORM_PROVISIONING_PASSWORD_CONFIRMATION_MISMATCH');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  }, 7001);

  it('rejects packages without approved snapshots before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = new PlatformProvisioningService(dataSource as never, { installSelected: jest.fn() } as never, new PlatformLaboratoryAuditService());
    await expect(service.provision({
      access_slug: 'lab-a', rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      plan_code: 'pilot', subscription_status: 'perpetual_free' as const, service_starts_at: '2026-10-30T00:00:00Z',
      service_expires_at: null, perpetual_free_reason: 'Pilot grant',
      branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Strong!Pass123',
      seedPackages: ['special-tests'],
    }, 7001)).rejects.toThrow('PLATFORM_PROVISIONING_SEED_PACKAGE_UNKNOWN');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('requires and validates a normalized tenant access slug before opening a transaction', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = new PlatformProvisioningService(dataSource as never, { installSelected: jest.fn() } as never, new PlatformLaboratoryAuditService());
    const input = {
      rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      plan_code: 'pilot', subscription_status: 'perpetual_free' as const, service_starts_at: '2026-10-30T00:00:00Z',
      service_expires_at: null, perpetual_free_reason: 'Pilot grant',
      branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Strong!Pass123', seedPackages: [],
    };

    await expect(service.provision({ ...input, access_slug: 'invalid slug!' }, 7001))
      .rejects.toThrow('PLATFORM_PROVISIONING_ACCESS_SLUG_INVALID');
    await expect(service.provision(input as never, 7001))
      .rejects.toThrow('PLATFORM_PROVISIONING_ACCESS_SLUG_REQUIRED');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a globally duplicated access slug before inserting a laboratory', async () => {
    const query = jest.fn(async (sql: string) => {
      if (String(sql).toLowerCase().includes('pg_advisory_xact_lock')) return undefined;
      if (String(sql).toLowerCase().includes('exists(select 1 from laboratory')) {
        return [{ rif: false, access_slug: true }];
      }
      throw new Error('UNEXPECTED_SQL');
    });
    const manager = { query };
    const dataSource = { transaction: jest.fn(async (_level, work) => work(manager)) };
    const service = new PlatformProvisioningService(
      dataSource as never,
      { installSelected: jest.fn() } as never,
      new PlatformLaboratoryAuditService(),
    );

    await expect(service.provision({
      access_slug: ' Lab A ', rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      plan_code: 'pilot', subscription_status: 'perpetual_free', service_starts_at: '2026-10-30T00:00:00Z',
      service_expires_at: null, perpetual_free_reason: 'Pilot grant',
      branchCode: 'MAIN', branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Strong!Pass123', seedPackages: [],
    }, 7001)).rejects.toThrow('PLATFORM_PROVISIONING_ACCESS_SLUG_EXISTS');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('requires explicit expiry for trial or active enrollment and supports an explicit perpetual grant', async () => {
    const dataSource = { transaction: jest.fn() };
    const service = new PlatformProvisioningService(dataSource as never, { installSelected: jest.fn() } as never, new PlatformLaboratoryAuditService());
    const common = {
      access_slug: 'lab-a', rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      plan_code: 'pilot', service_starts_at: '2026-10-30T00:00:00Z',
      branchName: 'Principal', administratorName: 'Admin', administratorUsername: 'admin',
      administratorPassword: 'Strong!Pass123', administratorPasswordConfirmation: 'Strong!Pass123',
    };

    await expect(service.provision({
      ...common, subscription_status: 'trial', service_expires_at: null,
    } as never, 7001)).rejects.toThrow('PLATFORM_SUBSCRIPTION_EXPIRY_REQUIRED');
    await expect(service.provision({
      ...common, subscription_status: 'perpetual_free', service_expires_at: null,
      perpetual_free_reason: 'Approved pilot',
    } as never, 7001)).resolves.toBeUndefined();
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('requires an active catalog plan for paid or trial enrollment and snapshots it in the tenant transaction', async () => {
    const query: jest.Mock<Promise<unknown>, [sql: string, parameters?: unknown[]]> = jest.fn(async (sql: string) => {
      const lower = sql.toLowerCase();
      if (lower.includes('pg_advisory_xact_lock')) return undefined;
      if (lower.includes('exists(select 1 from laboratory')) return [{ rif: false, access_slug: false }];
      if (lower.includes('from platform_subscription_plans')) {
        return [{
          id: 3, code: 'basic', name: 'Basic', description: 'Plan description', price: '12.50',
          currency: 'USD', billing_interval: 'monthly', grace_period_days: 5, limits_benefits: { users: 5 },
        }];
      }
      if (lower.startsWith('insert into laboratory')) return [{ id: 1, access_slug: 'lab-a' }];
      if (lower.startsWith('insert into platform_subscriptions')) return undefined;
      if (lower.startsWith('insert into laboratory_branches')) return [{ id: 2, code: 'PRINCIPAL', name: 'Principal' }];
      if (lower.includes('from information_schema.columns')) return [{ column_name: 'code', is_identity: 'NO' }];
      if (lower.startsWith('insert into "')) return undefined;
      if (lower.startsWith('select id from currencies')) return [{ id: 3 }];
      if (lower.startsWith('insert into application_settings')) return undefined;
      if (lower.startsWith('insert into security_roles')) return [{ id: 4 }];
      if (lower.startsWith('insert into security_role_permissions')) return undefined;
      if (lower.startsWith('insert into users')) return [{ id: 5, name: 'Admin', username: 'admin' }];
      if (lower.startsWith('insert into security_user_roles') || lower.startsWith('insert into platform_laboratory_audit_logs')) return undefined;
      throw new Error(`UNEXPECTED_SQL: ${sql}`);
    });
    const manager = { query };
    const dataSource = { transaction: jest.fn(async (_level, work) => work(manager)) };
    const service = new PlatformProvisioningService(
      dataSource as never,
      { installSelected: jest.fn().mockResolvedValue([]) } as never,
      new PlatformLaboratoryAuditService(),
    );
    await service.provision({
      access_slug: 'lab-a', rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      plan_code: 'BASIC', subscription_status: 'active', service_starts_at: '2026-10-30T00:00:00Z',
      service_expires_at: '2027-10-30T00:00:00Z', branchName: 'Principal', administratorName: 'Admin',
      administratorUsername: 'admin', administratorPassword: 'Strong!Pass123',
      administratorPasswordConfirmation: 'Strong!Pass123',
    }, 7001);
    const insert = query.mock.calls.find(([sql]) => String(sql).toLowerCase().startsWith('insert into platform_subscriptions'));
    expect(insert?.[1]).toEqual(expect.arrayContaining([
      3, 'basic', 'Basic', 'Plan description', '12.50', 'USD', 'monthly', '{"users":5}', 5,
    ]));
    expect(insert?.[1]?.[13]).toBe('2027-11-04T00:00:00.000Z');
    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
  });

  it('retries one serialization failure and returns an explicit conflict after the bounded retry', async () => {
    const dataSource = {
      transaction: jest.fn()
        .mockRejectedValueOnce(Object.assign(new Error('serialization failure'), { code: '40001' }))
        .mockRejectedValueOnce(Object.assign(new Error('serialization failure'), { code: '40001' })),
    };
    const service = new PlatformProvisioningService(
      dataSource as never,
      { installSelected: jest.fn() } as never,
      new PlatformLaboratoryAuditService(),
    );
    await expect(service.provision({
      access_slug: 'lab-a', rif: 'J-12345678-9', name: 'Lab', businessName: 'Lab CA', address: 'Caracas',
      subscription_status: 'perpetual_free', service_starts_at: '2026-10-30T00:00:00Z',
      service_expires_at: null,
      perpetual_free_reason: 'Owner grant', branchName: 'Principal', administratorName: 'Admin',
      administratorUsername: 'admin', administratorPassword: 'Strong!Pass123',
      administratorPasswordConfirmation: 'Strong!Pass123',
    }, 7001)).rejects.toThrow('PLATFORM_PROVISIONING_CONCURRENT_RETRY_REQUIRED');
    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
  });
});
