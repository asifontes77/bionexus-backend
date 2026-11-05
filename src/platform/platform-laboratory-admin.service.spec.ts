import { ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PlatformLaboratoryAdminService } from './platform-laboratory-admin.service';
import { PlatformLaboratoryAuditService } from './platform-laboratory-audit.service';

const laboratory = {
  id: 8,
  access_slug: 'lab-eight',
  service_mode: 'cloud',
  rif: 'J-12345678-9',
  name: 'Laboratorio',
  business_name: 'Laboratorio CA',
  address: 'Caracas',
  phone_1: null,
  email: null,
  is_active: true,
  plan_code: 'pilot',
  subscription_status: 'active',
  service_starts_at: new Date('2026-10-30T00:00:00Z'),
  service_expires_at: new Date('2027-10-30T00:00:00Z'),
  grace_until: null,
  perpetual_free_reason: null,
  perpetual_free_granted_at: null,
  perpetual_free_granted_by: null,
  commercial_notes: null,
};

const deletionColumns = [
  { table_name: 'laboratory', column_name: 'id' },
  ...[
    'users', 'security_roles', 'security_user_roles', 'security_role_permissions',
    'application_settings', 'laboratory_modules', 'laboratory_catalog_packages',
    'laboratory_branches', 'security_user_permission_overrides',
  ].map((table_name) => ({ table_name, column_name: 'laboratory_id' })),
  { table_name: 'platform_laboratory_audit_logs', column_name: 'id' },
  { table_name: 'platform_laboratory_audit_logs', column_name: 'laboratory_id' },
  { table_name: 'platform_laboratory_audit_logs', column_name: 'platform_owner_id' },
  ...[
    'sample_type', 'exam_catalog', 'exam_group', 'tax', 'type_payment', 'currencies',
    'tariffs', 'exam_tariff_prices', 'banks', 'antibiotic', 'parasiticforms', 'list_germs',
  ].flatMap((table_name) => [
    { table_name, column_name: 'laboratory_id' },
    { table_name, column_name: 'is_platform_managed' },
    { table_name, column_name: 'source_global_id' },
  ]),
];

function createService(
  managerQuery = jest.fn(async (_sql: string, _parameters?: unknown[]) => {
    void _sql;
    void _parameters;
    return [];
  }),
  transaction?: jest.Mock,
  packageInstaller = { installSelected: jest.fn() },
) {
  const manager = { query: managerQuery };
  const dataSource = {
    manager,
    query: managerQuery,
    transaction: transaction ?? jest.fn(async (...args: unknown[]) => {
      const work = args[args.length - 1] as (manager: unknown) => unknown;
      return work(manager);
    }),
  };
  return {
    service: new PlatformLaboratoryAdminService(
      dataSource as never,
      packageInstaller as never,
      new PlatformLaboratoryAuditService(),
    ),
    manager,
    dataSource,
    packageInstaller,
  };
}

describe('PlatformLaboratoryAdminService', () => {
  it('returns tenant access routing and commercial configuration without inventing access URLs', async () => {
    const query = jest.fn().mockResolvedValue([laboratory]);
    const { service } = createService(query);

    await expect(service.getLaboratory(8)).resolves.toEqual({
      laboratory,
      access: { slug: 'lab-eight' },
    });
    expect(query.mock.calls[0][0]).toContain('service_mode');
  });

  it('updates properties and explicit subscription dates in a tenant-scoped transaction', async () => {
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.startsWith('UPDATE laboratory')) return [{ ...laboratory, name: 'Nuevo nombre' }];
      if (sql.startsWith('INSERT INTO platform_laboratory_audit_logs')) return [];
      throw new Error('UNEXPECTED_SQL');
    });
    const { service, dataSource } = createService(query);

    await expect(service.updateLaboratory(8, {
      name: ' Nuevo nombre ',
      service_expires_at: '2027-12-30T00:00:00Z',
    }, 70)).resolves.toEqual(expect.objectContaining({
      laboratory: expect.objectContaining({ name: 'Nuevo nombre' }),
      access: { slug: 'lab-eight' },
    }));
    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    const update = query.mock.calls.find(([sql]) => String(sql).startsWith('UPDATE laboratory'));
    expect(update?.[0]).toContain('WHERE id=$');
    expect(update?.[1]).toContain(8);
    expect(update?.[1]).toContainEqual(new Date('2027-12-30T00:00:00Z'));
  });

  it('records suspension metadata when the platform owner suspends a laboratory', async () => {
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.startsWith('UPDATE laboratory')) return [{ ...laboratory, subscription_status: 'suspended' }];
      if (sql.startsWith('INSERT INTO platform_laboratory_audit_logs')) return [];
      throw new Error('UNEXPECTED_SQL');
    });
    const { service } = createService(query);

    await service.updateLaboratory(8, {
      subscription_status: 'suspended',
      suspension_reason: 'Owner requested',
    }, 70);
    const update = query.mock.calls.find(([sql]) => String(sql).startsWith('UPDATE laboratory'));
    expect(update?.[0]).toContain('"suspended_at"=$');
    expect(update?.[1]).toContain('Owner requested');
    const audit = query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO platform_laboratory_audit_logs'));
    expect(audit?.[1]).toEqual(expect.arrayContaining([
      8,
      70,
      'platform.laboratory.lifecycle.updated',
    ]));
    const auditMetadata = JSON.parse(String(audit?.[1]?.[4]));
    expect(auditMetadata.after.subscriptionStatus).toBe('suspended');
    expect(auditMetadata.before.subscriptionStatus).toBe('active');
  });

  it('audits reactivation and service extensions with the platform-owner actor', async () => {
    const suspendedLaboratory = {
      ...laboratory,
      subscription_status: 'suspended',
      suspension_reason: 'Owner requested',
      suspended_at: new Date('2026-10-30T00:00:00Z'),
    };
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('FROM laboratory WHERE id=$1')) return [suspendedLaboratory];
      if (sql.startsWith('UPDATE laboratory')) {
        return [{ ...suspendedLaboratory, subscription_status: 'active' }];
      }
      if (sql.startsWith('INSERT INTO platform_laboratory_audit_logs')) return [];
      throw new Error('UNEXPECTED_SQL');
    });
    const { service } = createService(query);

    await service.updateLaboratory(8, {
      subscription_status: 'active',
      service_expires_at: '2028-10-30T00:00:00Z',
    }, 70);
    await service.updateLaboratory(8, {
      service_expires_at: '2029-10-30T00:00:00Z',
    }, 70);

    const auditCalls = query.mock.calls.filter(([sql]) =>
      String(sql).startsWith('INSERT INTO platform_laboratory_audit_logs'),
    );
    expect(auditCalls).toHaveLength(2);
    for (const [, parameters] of auditCalls) {
      expect(parameters).toEqual(expect.arrayContaining([
        8,
        70,
        'platform.laboratory.lifecycle.updated',
      ]));
    }
  });

  it('requires explicit dates and a reason for perpetual-free status, and rejects unsupported modes/fields', async () => {
    const query = jest.fn().mockResolvedValue([laboratory]);
    const { service } = createService(query);

    await expect(service.updateLaboratory(8, {
      subscription_status: 'perpetual_free',
      service_expires_at: null,
      grace_until: null,
    }, 70)).rejects.toThrow('PLATFORM_PERPETUAL_FREE_REASON_REQUIRED');
    await expect(service.updateLaboratory(8, { service_mode: 'private' }, 70))
      .rejects.toThrow('PLATFORM_LABORATORY_UPDATE_FIELDS_INVALID');
  });

  it('delegates package installation to the existing catalog installer', async () => {
    const query = jest.fn().mockResolvedValue([laboratory]);
    const installer = { installSelected: jest.fn().mockResolvedValue([{ packageCode: 'germs' }]) };
    const { service } = createService(query, undefined, installer);

    await expect(service.installPackage(8, 'germs', 70)).resolves.toEqual({
      installed: [{ packageCode: 'germs' }],
    });
    expect(installer.installSelected).toHaveBeenCalledWith(
      expect.objectContaining({ query }),
      8,
      ['germs'],
      70,
    );
  });

  it('does not advertise packages that are already installed as available', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      return [{ packageCode: 'germs', installedVersion: '1.0.0', installationStatus: 'installed' }];
    });
    const { service } = createService(query);

    const packages = await service.listPackages(8);
    expect(packages.installed).toHaveLength(1);
    expect(packages.available.some((item) => item.code === 'germs')).toBe(false);
  });

  it('prevents removing packages required by another installed package', async () => {
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.includes('SELECT id,installation_status FROM laboratory_catalog_packages')) return [{ id: 'installed' }];
      if (sql.includes('SELECT package_code FROM laboratory_catalog_packages')) return [{ package_code: 'exams' }];
      throw new Error('UNEXPECTED_SQL');
    });
    const { service } = createService(query);

    await expect(service.uninstallPackage(8, 'sample-types')).rejects.toMatchObject({
      response: {
        code: 'PLATFORM_CATALOG_PACKAGE_REQUIRED_BY_INSTALLED_PACKAGE',
        requiredBy: ['exams'],
      },
    });
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM'))).toBe(false);
  });

  it('uninstalls catalog rows only from the addressed laboratory', async () => {
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.includes('SELECT id,installation_status FROM laboratory_catalog_packages')) return [{ id: 'installed' }];
      if (sql.includes('SELECT package_code FROM laboratory_catalog_packages')) return [];
      return [];
    });
    const { service } = createService(query);

    await expect(service.uninstallPackage(8, 'germs')).resolves.toEqual({ removed: true, packageCode: 'germs' });
    for (const [sql, parameters] of query.mock.calls.filter(([statement]) => String(statement).startsWith('DELETE FROM'))) {
      expect(sql).toContain('laboratory_id=$1');
      expect(parameters).toContain(8);
    }
  });

  it('inserts a branch in the requested tenant and never removes the main branch', async () => {
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.startsWith('INSERT INTO laboratory_branches')) return [{ id: 11, laboratoryId: 8, code: 'NORTH' }];
      if (sql.startsWith('SELECT id,is_main')) return [{ id: 10, is_main: true }];
      throw new Error('UNEXPECTED_SQL');
    });
    const { service } = createService(query);

    await expect(service.addBranch(8, { code: ' north ', name: 'Norte' })).resolves.toMatchObject({
      id: 11,
      code: 'NORTH',
    });
    expect(query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO laboratory_branches'))?.[1]?.[0]).toBe(8);
    await expect(service.removeBranch(8, 10)).rejects.toThrow('PLATFORM_LABORATORY_MAIN_BRANCH_CANNOT_BE_REMOVED');
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM laboratory_branches'))).toBe(false);
  });

  it('rejects a non-owner and rejects an incorrect owner password before touching a laboratory', async () => {
    const noOwner = createService();
    await expect(noOwner.service.deleteLaboratory(8, 0, 'not-used')).rejects.toBeInstanceOf(ForbiddenException);
    expect(noOwner.dataSource.transaction).not.toHaveBeenCalled();

    const compare = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    try {
      const query = jest.fn().mockResolvedValue([{ password_hash: 'hash' }]);
      const { service } = createService(query);
      await expect(service.deleteLaboratory(8, 70, 'wrong-password')).rejects.toThrow('PLATFORM_OWNER_PASSWORD_INVALID');
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toContain('platform_owners');
    } finally {
      compare.mockRestore();
    }
  });

  it('blocks deletion with a dependency summary and performs no deletes', async () => {
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('platform_owners')) return [{ password_hash: 'hash' }];
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.includes('information_schema.columns')) return [
        ...deletionColumns,
        { table_name: 'invoice', column_name: 'laboratory_id' },
      ];
      if (sql.includes('pg_constraint')) return [
        { childTable: 'platform_laboratory_audit_logs', parentTable: 'platform_owners' },
      ];
      if (sql.includes('FROM "invoice"')) return [{ count: 2 }];
      if (sql.includes('FROM "laboratory_branches"')) return [{ count: 1 }];
      if (sql.includes('FROM "users"')) return [{ count: 1 }];
      if (sql.includes('FROM "security_roles"')) return [{ count: 1 }];
      if (sql.includes('FROM users')) return [{ count: 1, safe_count: 1 }];
      if (sql.includes('FROM security_roles')) return [{ count: 1, safe_count: 1 }];
      if (sql.includes('FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND installation_status')) return [{ count: 0 }];
      if (sql.startsWith('SELECT COUNT(*)::int AS count FROM "')) return [{ count: 0 }];
      throw new Error('UNEXPECTED_SQL');
    });
    const compare = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    try {
      const { service } = createService(query);
      await expect(service.deleteLaboratory(8, 70, 'correct-password')).rejects.toMatchObject({
        response: {
          code: 'PLATFORM_LABORATORY_DELETION_BLOCKED',
          dependencies: [{ table: 'invoice', count: 2 }],
        },
      });
      expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM'))).toBe(false);
    } finally {
      compare.mockRestore();
    }
  });

  it('refuses deletion when the schema is missing a required tenant-scoped table', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('platform_owners')) return [{ password_hash: 'hash' }];
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.includes('information_schema.columns')) return [
        { table_name: 'laboratory', column_name: 'id' },
        { table_name: 'laboratory_branches', column_name: 'laboratory_id' },
      ];
      throw new Error('UNEXPECTED_SQL');
    });
    const compare = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    try {
      const { service } = createService(query);
      await expect(service.deleteLaboratory(8, 70, 'correct-password'))
        .rejects.toThrow('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM'))).toBe(false);
    } finally {
      compare.mockRestore();
    }
  });

  it('deletes only safe provisioning rows for the selected tenant after reauthentication', async () => {
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('platform_owners')) return [{ password_hash: 'hash' }];
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.includes('information_schema.columns')) return deletionColumns;
      if (sql.includes('pg_constraint')) return [
        { childTable: 'platform_laboratory_audit_logs', parentTable: 'platform_owners' },
      ];
      if (sql.includes('FROM "laboratory_branches"')) return [{ count: 1 }];
      if (sql.includes('FROM "users"')) return [{ count: 1 }];
      if (sql.includes('FROM "security_roles"')) return [{ count: 1 }];
      if (sql.includes('FROM users')) return [{ count: 1, safe_count: 1 }];
      if (sql.includes('FROM security_roles')) return [{ count: 1, safe_count: 1 }];
      if (sql.includes('FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND installation_status')) return [{ count: 0 }];
      if (sql.startsWith('SELECT COUNT(*)::int AS count FROM "')) return [{ count: 0 }];
      if (sql.startsWith('INSERT INTO platform_laboratory_audit_logs')) return [];
      if (sql.startsWith('DELETE FROM laboratory WHERE')) return [{ id: 8 }];
      return [];
    });
    const compare = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    try {
      const { service, dataSource } = createService(query);
      await expect(service.deleteLaboratory(8, 70, 'correct-password')).resolves.toEqual({
        deleted: true,
        laboratoryId: 8,
      });
      expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
      const deletes = query.mock.calls.filter(([sql]) => String(sql).startsWith('DELETE FROM'));
      expect(deletes[deletes.length - 1]?.[0]).toContain('DELETE FROM laboratory WHERE id=$1');
      for (const entry of deletes) expect(entry[1]).toContain(8);
      const auditIndex = query.mock.calls.findIndex(([sql]) => String(sql).startsWith('INSERT INTO platform_laboratory_audit_logs'));
      const firstDeleteIndex = query.mock.calls.findIndex(([sql]) => String(sql).startsWith('DELETE FROM'));
      expect(auditIndex).toBeGreaterThan(-1);
      expect(auditIndex).toBeLessThan(firstDeleteIndex);
      expect(query.mock.calls[auditIndex][1]).toEqual(expect.arrayContaining([
        8,
        70,
        'platform.laboratory.deleted',
      ]));
      expect(query.mock.calls.some(([sql]) =>
        String(sql).includes('FROM "platform_laboratory_audit_logs"'),
      )).toBe(false);
      expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM platform_laboratory_audit_logs'))).toBe(false);
    } finally {
      compare.mockRestore();
    }
  });

  it('rolls back when a provisioning delete hits an unexpected foreign-key dependency', async () => {
    let rolledBack = false;
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      void _parameters;
      if (sql.includes('platform_owners')) return [{ password_hash: 'hash' }];
      if (sql.includes('FROM laboratory WHERE id=$1')) return [laboratory];
      if (sql.includes('information_schema.columns')) return deletionColumns;
      if (sql.includes('pg_constraint')) return [
        { childTable: 'platform_laboratory_audit_logs', parentTable: 'platform_owners' },
      ];
      if (sql.includes('FROM "laboratory_branches"')) return [{ count: 1 }];
      if (sql.includes('FROM "users"')) return [{ count: 1 }];
      if (sql.includes('FROM "security_roles"')) return [{ count: 1 }];
      if (sql.includes('FROM users')) return [{ count: 1, safe_count: 1 }];
      if (sql.includes('FROM security_roles')) return [{ count: 1, safe_count: 1 }];
      if (sql.includes('FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND installation_status')) return [{ count: 0 }];
      if (sql.startsWith('SELECT COUNT(*)::int AS count FROM "')) return [{ count: 0 }];
      if (sql.startsWith('DELETE FROM security_user_roles')) {
        throw Object.assign(new Error('foreign key'), { code: '23503' });
      }
      return [];
    });
    const transaction = jest.fn(async (_level: unknown, work: (manager: unknown) => Promise<unknown>) => {
      try {
        return await work({ query });
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    });
    const compare = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    try {
      const { service } = createService(query, transaction);
      await expect(service.deleteLaboratory(8, 70, 'correct-password')).rejects.toBeInstanceOf(ConflictException);
      expect(rolledBack).toBe(true);
      expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM laboratory WHERE'))).toBe(false);
    } finally {
      compare.mockRestore();
    }
  });
});
