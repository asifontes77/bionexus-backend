import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { normalizeLaboratoryAccessSlug } from '../laboratory/access-slug';
import { GRANULAR_SEED_PACKAGES, resolveGranularSeedPackages } from './seed-package-catalog';
import { TenantCatalogPackageInstallerService } from './tenant-catalog-package-installer.service';
import { PlatformLaboratoryAuditService } from './platform-laboratory-audit.service';

const SUBSCRIPTION_STATUSES = ['trial', 'active', 'grace', 'suspended', 'cancelled', 'perpetual_free'] as const;
const PACKAGE_TABLES: string[] = Object.values(GRANULAR_SEED_PACKAGES).flatMap(({ tables }) => [...tables]);
const SAFE_PROVISIONING_TABLES = new Set([
  'users',
  'security_roles',
  'security_user_roles',
  'security_role_permissions',
  'application_settings',
  'laboratory_modules',
  'laboratory_catalog_packages',
  'laboratory_branches',
  ...PACKAGE_TABLES,
]);

type LaboratoryPatch = Record<string, unknown>;

@Injectable()
export class PlatformLaboratoryAdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantPackages: TenantCatalogPackageInstallerService,
    private readonly audit: PlatformLaboratoryAuditService,
  ) {}

  async getLaboratory(laboratoryId: number) {
    const laboratory = await this.findLaboratory(this.dataSource.manager, laboratoryId);
    return { laboratory, access: { slug: laboratory.access_slug } };
  }

  async updateLaboratory(laboratoryId: number, input: LaboratoryPatch, ownerId: number) {
    const allowed: Record<string, string> = {
      rif: 'rif',
      name: 'name',
      business_name: 'business_name',
      address: 'address',
      phone_1: 'phone_1',
      email: 'email',
      access_slug: 'access_slug',
      is_active: 'is_active',
      plan_code: 'plan_code',
      subscription_status: 'subscription_status',
      service_starts_at: 'service_starts_at',
      service_expires_at: 'service_expires_at',
      grace_until: 'grace_until',
      perpetual_free_reason: 'perpetual_free_reason',
      suspension_reason: 'suspension_reason',
      commercial_notes: 'commercial_notes',
    };
    const keys = Object.keys(input ?? {});
    if (!keys.length || keys.some((key) => !allowed[key])) {
      throw new BadRequestException('PLATFORM_LABORATORY_UPDATE_FIELDS_INVALID');
    }

    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const current = await this.findLaboratory(manager, laboratoryId, true);
      const merged = { ...current, ...input };
      const lifecycleFields = [
        'plan_code', 'subscription_status', 'service_starts_at', 'service_expires_at',
        'grace_until', 'perpetual_free_reason',
      ];
      const lifecycleConfigured = current.plan_code != null || current.subscription_status != null || current.service_starts_at != null;
      const validated = keys.some((key) => lifecycleFields.includes(key)) || lifecycleConfigured
        ? this.validateSubscription(merged, ownerId, true)
        : null;
      const values: unknown[] = [];
      const assignments = keys.map((key) => {
        let value = input[key];
        if (key === 'access_slug') {
          value = normalizeLaboratoryAccessSlug(String(value ?? ''));
          if (!value) throw new BadRequestException('PLATFORM_PROVISIONING_ACCESS_SLUG_INVALID');
        } else if (key === 'is_active') {
          if (typeof value !== 'boolean') throw new BadRequestException('PLATFORM_LABORATORY_ACTIVE_INVALID');
        } else if (['rif', 'name', 'business_name', 'address', 'plan_code'].includes(key)) {
          if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('PLATFORM_LABORATORY_FIELD_REQUIRED');
          const textValue = value.trim();
          const maximumLength: Record<string, number> = {
            rif: 20,
            name: 50,
            business_name: 100,
            address: 200,
            plan_code: 80,
          };
          if (textValue.length > maximumLength[key]) throw new BadRequestException('PLATFORM_LABORATORY_FIELD_INVALID');
          if (key === 'rif' && !/^[VEJG]-?\d{7,9}-?\d$/i.test(textValue)) {
            throw new BadRequestException('PLATFORM_PROVISIONING_RIF_INVALID');
          }
          value = textValue;
        } else if (['phone_1', 'email', 'commercial_notes', 'perpetual_free_reason', 'suspension_reason'].includes(key)) {
          value = typeof value === 'string' && value.trim() ? value.trim() : null;
          if (key === 'phone_1' && typeof value === 'string' && value.length > 20) {
            throw new BadRequestException('PLATFORM_LABORATORY_FIELD_INVALID');
          }
          if (key === 'email' && typeof value === 'string') {
            if (value.length > 100) throw new BadRequestException('PLATFORM_LABORATORY_FIELD_INVALID');
            value = value.toLowerCase();
          }
        } else if (['service_starts_at', 'service_expires_at', 'grace_until'].includes(key)) {
          value = this.parseTimestamp(value, key === 'service_starts_at' || (key === 'service_expires_at' && merged.subscription_status !== 'perpetual_free'));
        } else if (key === 'subscription_status') {
          if (!SUBSCRIPTION_STATUSES.includes(value as (typeof SUBSCRIPTION_STATUSES)[number])) {
            throw new BadRequestException('PLATFORM_SUBSCRIPTION_STATUS_INVALID');
          }
          value = validated!.subscriptionStatus;
        }
        values.push(value);
        return `"${allowed[key]}"=$${values.length}`;
      });

      if (keys.includes('subscription_status') || keys.includes('service_expires_at') || keys.includes('grace_until')
        || keys.includes('perpetual_free_reason')) {
        this.appendSubscriptionAudit(assignments, values, validated!, ownerId);
      }
      if (input.subscription_status === 'suspended' && current.subscription_status !== 'suspended') {
        values.push(new Date().toISOString());
        assignments.push(`"suspended_at"=$${values.length}`);
      }

      values.push(laboratoryId);
      let rows: Array<Record<string, unknown>>;
      try {
        rows = await manager.query(
          `UPDATE laboratory SET ${assignments.join(',')} WHERE id=$${values.length} RETURNING ${this.laboratoryProjection()}`,
          values,
        );
      } catch (error) {
        if (this.isUniqueViolation(error)) throw new ConflictException('PLATFORM_LABORATORY_PROPERTY_CONFLICT');
        throw error;
      }
      if (!rows[0]) throw new NotFoundException('PLATFORM_LABORATORY_NOT_FOUND');
      const auditedLifecycleFields = keys.filter((key) => [
        'is_active', 'plan_code', 'subscription_status', 'service_starts_at',
        'service_expires_at', 'grace_until', 'perpetual_free_reason',
        'suspension_reason',
      ].includes(key));
      if (auditedLifecycleFields.length) {
        await this.audit.write(manager, {
          laboratoryId,
          platformOwnerId: ownerId,
          action: 'platform.laboratory.lifecycle.updated',
          summary: 'Platform owner updated laboratory lifecycle',
          metadata: {
            changedFields: auditedLifecycleFields,
            before: this.lifecycleSnapshot(current),
            after: this.lifecycleSnapshot(rows[0]),
          },
        });
      }
      return { laboratory: rows[0], access: { slug: rows[0].access_slug } };
    });
  }

  async listPackages(laboratoryId: number) {
    await this.findLaboratory(this.dataSource.manager, laboratoryId);
    const installed = await this.dataSource.query(
      `SELECT package_code AS "packageCode",installed_version AS "installedVersion",source_checksum AS "sourceChecksum",installation_status AS "installationStatus",installed_at AS "installedAt",last_checked_at AS "lastCheckedAt" FROM laboratory_catalog_packages WHERE laboratory_id=$1 ORDER BY package_code`,
      [laboratoryId],
    );
    const installedCodes = new Set(installed.map((item: { packageCode: string }) => item.packageCode));
    const available = Object.entries(GRANULAR_SEED_PACKAGES)
      .filter(([code]) => !installedCodes.has(code))
      .map(([code, value]) => ({
        code,
        dependencies: [...value.dependencies],
      }));
    return { installed, available };
  }

  async installPackage(laboratoryId: number, packageCode: string, ownerId: number) {
    this.validatePackageCode(packageCode);
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      await this.findLaboratory(manager, laboratoryId, true);
      const installed = await this.tenantPackages.installSelected(manager, laboratoryId, [packageCode], ownerId);
      return { installed };
    });
  }

  async uninstallPackage(laboratoryId: number, packageCode: string) {
    this.validatePackageCode(packageCode);
    if (packageCode === 'currencies') throw new ConflictException('PLATFORM_CATALOG_PACKAGE_REQUIRED');
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      await this.findLaboratory(manager, laboratoryId, true);
      const installed = await manager.query(
        `SELECT id,installation_status FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND package_code=$2 FOR UPDATE`,
        [laboratoryId, packageCode],
      );
      if (!installed[0]) throw new NotFoundException('PLATFORM_CATALOG_PACKAGE_NOT_INSTALLED');
      if (installed[0].installation_status === 'customized') {
        throw new ConflictException('PLATFORM_CATALOG_PACKAGE_CUSTOMIZED');
      }
      const otherPackages = await manager.query(
        `SELECT package_code FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND package_code<>$2`,
        [laboratoryId, packageCode],
      );
      const requiredBy = otherPackages
        .map((row: { package_code: string }) => row.package_code)
        .filter((code: string) => resolveGranularSeedPackages([code]).includes(packageCode as never));
      if (requiredBy.length) {
        throw new ConflictException({ code: 'PLATFORM_CATALOG_PACKAGE_REQUIRED_BY_INSTALLED_PACKAGE', requiredBy });
      }

      try {
        for (const table of [...GRANULAR_SEED_PACKAGES[packageCode as keyof typeof GRANULAR_SEED_PACKAGES].tables].reverse()) {
          await manager.query(
            `DELETE FROM "${table}" WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
            [laboratoryId],
          );
        }
      } catch (error) {
        if (this.isForeignKeyError(error)) {
          throw new ConflictException('PLATFORM_CATALOG_PACKAGE_IN_USE');
        }
        throw error;
      }
      await manager.query(
        `DELETE FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND package_code=$2`,
        [laboratoryId, packageCode],
      );
      return { removed: true, packageCode };
    });
  }

  async listBranches(laboratoryId: number) {
    await this.findLaboratory(this.dataSource.manager, laboratoryId);
    return this.dataSource.query(
      `SELECT id,laboratory_id AS "laboratoryId",code,name,address,phone,email,is_main AS "isMain",is_active AS "isActive",display_order AS "displayOrder",created_at AS "createdAt",updated_at AS "updatedAt" FROM laboratory_branches WHERE laboratory_id=$1 ORDER BY is_main DESC,display_order,id`,
      [laboratoryId],
    );
  }

  async addBranch(laboratoryId: number, input: Record<string, unknown>) {
    const code = this.requiredText(input?.code, 30, 'PLATFORM_LABORATORY_BRANCH_CODE_REQUIRED').toUpperCase();
    const name = this.requiredText(input?.name, 100, 'PLATFORM_LABORATORY_BRANCH_NAME_REQUIRED');
    const address = this.optionalText(input?.address, 200);
    const phone = this.optionalText(input?.phone, 20);
    const email = this.optionalText(input?.email, 100);
    const displayOrder = input?.displayOrder ?? 0;
    if (!Number.isInteger(displayOrder) || Number(displayOrder) < 0) {
      throw new BadRequestException('PLATFORM_LABORATORY_BRANCH_DISPLAY_ORDER_INVALID');
    }
    return this.dataSource.transaction(async (manager) => {
      await this.findLaboratory(manager, laboratoryId, true);
      let rows: Array<Record<string, unknown>>;
      try {
        rows = await manager.query(
          `INSERT INTO laboratory_branches (laboratory_id,code,name,address,phone,email,is_main,is_active,display_order) VALUES ($1,$2,$3,$4,$5,$6,false,true,$7) RETURNING id,laboratory_id AS "laboratoryId",code,name,address,phone,email,is_main AS "isMain",is_active AS "isActive",display_order AS "displayOrder"`,
          [laboratoryId, code, name, address, phone, email, displayOrder],
        );
      } catch (error) {
        if (this.isUniqueViolation(error)) throw new ConflictException('PLATFORM_LABORATORY_BRANCH_CODE_EXISTS');
        throw error;
      }
      return rows[0];
    });
  }

  async removeBranch(laboratoryId: number, branchId: number) {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `SELECT id,is_main FROM laboratory_branches WHERE laboratory_id=$1 AND id=$2 FOR UPDATE`,
        [laboratoryId, branchId],
      );
      if (!rows[0]) throw new NotFoundException('PLATFORM_LABORATORY_BRANCH_NOT_FOUND');
      if (rows[0].is_main) throw new ConflictException('PLATFORM_LABORATORY_MAIN_BRANCH_CANNOT_BE_REMOVED');
      try {
        await manager.query(`DELETE FROM laboratory_branches WHERE laboratory_id=$1 AND id=$2`, [laboratoryId, branchId]);
      } catch (error) {
        if (this.isForeignKeyError(error)) throw new ConflictException('PLATFORM_LABORATORY_BRANCH_IN_USE');
        throw error;
      }
      return { removed: true, branchId };
    });
  }

  async deleteLaboratory(laboratoryId: number, ownerId: number, password: string) {
    if (!Number.isInteger(ownerId) || ownerId <= 0) throw new ForbiddenException('PLATFORM_OWNER_REQUIRED');
    if (typeof password !== 'string' || !password) throw new BadRequestException('PLATFORM_OWNER_PASSWORD_REQUIRED');
    if (password.length > 200) throw new BadRequestException('PLATFORM_OWNER_PASSWORD_INVALID');
    try {
      return await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        const owner = await manager.query(
          `SELECT password_hash FROM platform_owners WHERE id=$1 AND is_active=true FOR UPDATE`,
          [ownerId],
        );
        if (!owner[0] || !(await bcrypt.compare(password, owner[0].password_hash))) {
          throw new ForbiddenException('PLATFORM_OWNER_PASSWORD_INVALID');
        }
        await this.findLaboratory(manager, laboratoryId, true);
        await this.assertSafeEmptyLaboratory(manager, laboratoryId);
        const laboratory = await this.findLaboratory(manager, laboratoryId);
        await this.audit.write(manager, {
          laboratoryId,
          platformOwnerId: ownerId,
          action: 'platform.laboratory.deleted',
          summary: 'Platform owner deleted an empty Cloud laboratory',
          metadata: {
            accessSlug: laboratory.access_slug,
            rif: laboratory.rif,
            name: laboratory.name,
            planCode: laboratory.plan_code,
            subscriptionStatus: laboratory.subscription_status,
          },
        });
        await this.deleteProvisioningRows(manager, laboratoryId);
        const deleted = await manager.query(`DELETE FROM laboratory WHERE id=$1 RETURNING id`, [laboratoryId]);
        if (!deleted[0]) throw new NotFoundException('PLATFORM_LABORATORY_NOT_FOUND');
        return { deleted: true, laboratoryId };
      });
    } catch (error) {
      if (this.isForeignKeyError(error)) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
      throw error;
    }
  }

  private async assertSafeEmptyLaboratory(manager: EntityManager, laboratoryId: number) {
    const columns = await manager.query(
      `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND (column_name IN ('laboratory_id','is_platform_managed','source_global_id') OR table_name IN ('laboratory','license','platform_laboratory_audit_logs'))`,
    ) as Array<{ table_name: string; column_name: string }>;
    const tableColumns = new Map<string, Set<string>>();
    for (const row of columns) {
      if (!tableColumns.has(row.table_name)) tableColumns.set(row.table_name, new Set());
      tableColumns.get(row.table_name)!.add(row.column_name);
    }
    const requiredTables = [
      ...SAFE_PROVISIONING_TABLES,
      'security_user_permission_overrides',
    ];
    for (const table of requiredTables) {
      if (!tableColumns.get(table)?.has('laboratory_id')) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
    }
    const auditColumns = tableColumns.get('platform_laboratory_audit_logs');
    if (!auditColumns?.has('laboratory_id') || !auditColumns.has('platform_owner_id')) {
      throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
    }
    for (const table of PACKAGE_TABLES) {
      const available = tableColumns.get(table);
      if (!available?.has('is_platform_managed') || !available.has('source_global_id')) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
    }
    if (!tableColumns.has('laboratory')) throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
    if (tableColumns.has('license') && !tableColumns.get('license')?.has('laboratory_id')) {
      const licenseRows = await manager.query(`SELECT COUNT(*)::int AS count FROM license`);
      if (Number(licenseRows[0]?.count ?? 0)) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
    }

    const foreignKeys = await manager.query(
      `SELECT child.relname AS "childTable",parent.relname AS "parentTable",
       current_schema() AS "currentSchema",
       child_schema.nspname AS "childSchema",parent_schema.nspname AS "parentSchema",
        foreign_key.confdeltype AS "deleteAction",
        ARRAY(
          SELECT child_attribute.attname
          FROM unnest(foreign_key.conkey) WITH ORDINALITY AS child_key(attnum,position)
          JOIN pg_attribute child_attribute
            ON child_attribute.attrelid=child.oid AND child_attribute.attnum=child_key.attnum
          ORDER BY child_key.position
        ) AS "childColumns",
        ARRAY(
          SELECT parent_attribute.attname
          FROM unnest(foreign_key.confkey) WITH ORDINALITY AS parent_key(attnum,position)
          JOIN pg_attribute parent_attribute
            ON parent_attribute.attrelid=parent.oid AND parent_attribute.attnum=parent_key.attnum
          ORDER BY parent_key.position
        ) AS "parentColumns"
       FROM pg_constraint foreign_key
       JOIN pg_class child ON child.oid=foreign_key.conrelid
       JOIN pg_namespace child_schema ON child_schema.oid=child.relnamespace
       JOIN pg_class parent ON parent.oid=foreign_key.confrelid
       JOIN pg_namespace parent_schema ON parent_schema.oid=parent.relnamespace
       WHERE foreign_key.contype='f'
         AND parent_schema.nspname=current_schema()`,
    ) as Array<{
      childTable: string;
      parentTable: string;
      currentSchema: string;
      childSchema: string;
      parentSchema: string;
      deleteAction: string;
      childColumns: string[];
      parentColumns: string[];
    }>;
    if (
      foreignKeys.some(({ childTable, parentTable }) =>
        childTable === 'platform_laboratory_audit_logs' && parentTable === 'laboratory',
      ) ||
      !foreignKeys.some(({ childTable, parentTable }) =>
        childTable === 'platform_laboratory_audit_logs' && parentTable === 'platform_owners',
      )
    ) {
      throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
    }
    for (const foreignKey of foreignKeys) {
      if (foreignKey.parentSchema !== foreignKey.currentSchema) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
      if ((foreignKey.parentTable === 'laboratory' || tableColumns.get(foreignKey.parentTable)?.has('laboratory_id'))
        && (foreignKey.childSchema !== foreignKey.currentSchema || !tableColumns.get(foreignKey.childTable)?.has('laboratory_id'))) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
      if (!['a', 'r', 'c', 'n', 'd'].includes(foreignKey.deleteAction)) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
    }
    await this.assertNoCrossTenantReferences(manager, laboratoryId, foreignKeys, tableColumns);

    const dependencies: Array<{ table: string; count: number }> = [];
    for (const [table, availableColumns] of tableColumns) {
      if (
        !availableColumns.has('laboratory_id') ||
        table === 'laboratory' ||
        table === 'platform_laboratory_audit_logs'
      ) continue;
      const countRows = await manager.query(
        `SELECT COUNT(*)::int AS count FROM "${table}" WHERE laboratory_id=$1`,
        [laboratoryId],
      );
      const count = Number(countRows[0]?.count ?? 0);
      if (!count) continue;
      if (!SAFE_PROVISIONING_TABLES.has(table)) {
        dependencies.push({ table, count });
        continue;
      }
      if (PACKAGE_TABLES.includes(table)) {
        if (!availableColumns.has('is_platform_managed') || !availableColumns.has('source_global_id')) {
          throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
        }
        const custom = await manager.query(
          `SELECT COUNT(*)::int AS count FROM "${table}" WHERE laboratory_id=$1 AND (is_platform_managed=false OR source_global_id IS NULL)`,
          [laboratoryId],
        );
        if (Number(custom[0]?.count ?? 0)) dependencies.push({ table, count: Number(custom[0].count) });
      }
    }

    const userRows = await manager.query(
      `SELECT COUNT(*)::int AS count,COUNT(*) FILTER (WHERE roles='administrator')::int AS safe_count FROM users WHERE laboratory_id=$1`,
      [laboratoryId],
    );
    const userCount = Number(userRows[0]?.count ?? 0);
    const safeUserCount = Number(userRows[0]?.safe_count ?? 0);
    if (userCount > 1 || userCount !== safeUserCount) {
      dependencies.push({ table: 'users', count: Number(userRows[0]?.count ?? 0) });
    }
    const roleRows = await manager.query(
      `SELECT COUNT(*)::int AS count,COUNT(*) FILTER (WHERE lower(btrim(code))='administrator' AND is_system=true)::int AS safe_count FROM security_roles WHERE laboratory_id=$1`,
      [laboratoryId],
    );
    const roleCount = Number(roleRows[0]?.count ?? 0);
    const safeRoleCount = Number(roleRows[0]?.safe_count ?? 0);
    if (roleCount > 1 || roleCount !== safeRoleCount) {
      dependencies.push({ table: 'security_roles', count: Number(roleRows[0]?.count ?? 0) });
    }
    const customizedPackages = await manager.query(
      `SELECT COUNT(*)::int AS count FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND installation_status<>'installed'`,
      [laboratoryId],
    );
    if (Number(customizedPackages[0]?.count ?? 0)) {
      dependencies.push({ table: 'laboratory_catalog_packages', count: Number(customizedPackages[0].count) });
    }
    if (dependencies.length) {
      throw new ConflictException({ code: 'PLATFORM_LABORATORY_DELETION_BLOCKED', dependencies });
    }
  }

  private async assertNoCrossTenantReferences(
    manager: EntityManager,
    laboratoryId: number,
    foreignKeys: Array<{
      childTable: string;
      parentTable: string;
      currentSchema: string;
      childSchema: string;
      parentSchema: string;
      deleteAction: string;
      childColumns: string[];
      parentColumns: string[];
    }>,
    tableColumns: Map<string, Set<string>>,
  ) {
    const parentTablesToDelete = new Set([
      ...SAFE_PROVISIONING_TABLES,
      ...PACKAGE_TABLES,
      'laboratory',
    ]);
    const dependencies: Array<Record<string, unknown>> = [];

    for (const foreignKey of foreignKeys) {
      if (!parentTablesToDelete.has(foreignKey.parentTable)) continue;
      if (
        foreignKey.childSchema !== foreignKey.currentSchema ||
        foreignKey.parentSchema !== foreignKey.currentSchema
      ) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
      if (
        !Array.isArray(foreignKey.childColumns) ||
        !Array.isArray(foreignKey.parentColumns) ||
        foreignKey.childColumns.length === 0 ||
        foreignKey.childColumns.length !== foreignKey.parentColumns.length
      ) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }
      const childColumns = tableColumns.get(foreignKey.childTable);
      const parentColumns = tableColumns.get(foreignKey.parentTable);
      if (
        !childColumns?.has('laboratory_id') ||
        (foreignKey.parentTable !== 'laboratory' && !parentColumns?.has('laboratory_id'))
      ) {
        throw new ConflictException('PLATFORM_LABORATORY_DELETION_SCHEMA_UNSAFE');
      }

      const quoteIdentifier = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;
      const join = foreignKey.childColumns
        .map((childColumn, index) =>
          `referencing.${quoteIdentifier(childColumn)}=referenced.${quoteIdentifier(foreignKey.parentColumns[index])}`,
        )
        .join(' AND ');
      const parentScope = foreignKey.parentTable === 'laboratory'
        ? 'referenced."id"=$1'
        : 'referenced."laboratory_id"=$1';
      const references = await manager.query(
        `SELECT COUNT(*)::int AS count
         FROM ${quoteIdentifier(foreignKey.childTable)} referencing
         JOIN ${quoteIdentifier(foreignKey.parentTable)} referenced ON ${join}
         WHERE ${parentScope}
           AND referencing."laboratory_id" IS DISTINCT FROM $1`,
        [laboratoryId],
      );
      const count = Number(references[0]?.count ?? 0);
      if (count > 0) {
        dependencies.push({
          table: foreignKey.childTable,
          count,
          reason: 'cross_tenant_reference',
          referencedTable: foreignKey.parentTable,
          deleteAction: foreignKey.deleteAction,
        });
      }
    }

    if (dependencies.length) {
      throw new ConflictException({
        code: 'PLATFORM_LABORATORY_DELETION_BLOCKED',
        dependencies,
      });
    }
  }

  private async deleteProvisioningRows(manager: EntityManager, laboratoryId: number) {
    const queries = [
      `DELETE FROM security_user_roles WHERE laboratory_id=$1`,
      `DELETE FROM security_role_permissions WHERE laboratory_id=$1`,
      `DELETE FROM security_user_permission_overrides WHERE laboratory_id=$1`,
      `DELETE FROM application_settings WHERE laboratory_id=$1`,
      `DELETE FROM laboratory_modules WHERE laboratory_id=$1`,
      `DELETE FROM laboratory_catalog_packages WHERE laboratory_id=$1`,
      `DELETE FROM users WHERE laboratory_id=$1`,
      `DELETE FROM security_roles WHERE laboratory_id=$1`,
      `DELETE FROM exam_tariff_prices WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM exam_catalog WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM tariffs WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM exam_group WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM tax WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM sample_type WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM currencies WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM antibiotic WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM list_germs WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM parasiticforms WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM banks WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM type_payment WHERE laboratory_id=$1 AND is_platform_managed=true AND source_global_id IS NOT NULL`,
      `DELETE FROM laboratory_branches WHERE laboratory_id=$1`,
    ];
    for (const sql of queries) await manager.query(sql, [laboratoryId]);
  }

  private async findLaboratory(manager: EntityManager, laboratoryId: number, lock = false) {
    if (!Number.isInteger(laboratoryId) || laboratoryId <= 0) throw new BadRequestException('PLATFORM_LABORATORY_ID_INVALID');
    const rows = await manager.query(
      `SELECT ${this.laboratoryProjection()} FROM laboratory WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
      [laboratoryId],
    );
    if (!rows[0]) throw new NotFoundException('PLATFORM_LABORATORY_NOT_FOUND');
    return rows[0];
  }

  private laboratoryProjection() {
    return `id,access_slug,service_mode,rif,name,business_name,address,phone_1,email,is_active,plan_code,subscription_status,service_starts_at,service_expires_at,grace_until,perpetual_free_reason,perpetual_free_granted_at,perpetual_free_granted_by,suspension_reason,suspended_at,commercial_notes`;
  }

  private lifecycleSnapshot(laboratory: Record<string, unknown>) {
    return {
      isActive: laboratory.is_active,
      planCode: laboratory.plan_code,
      subscriptionStatus: laboratory.subscription_status,
      serviceStartsAt: laboratory.service_starts_at,
      serviceExpiresAt: laboratory.service_expires_at,
      graceUntil: laboratory.grace_until,
      perpetualFreeReason: laboratory.perpetual_free_reason,
      perpetualFreeGrantedAt: laboratory.perpetual_free_granted_at,
      perpetualFreeGrantedBy: laboratory.perpetual_free_granted_by,
      suspensionReason: laboratory.suspension_reason,
      suspendedAt: laboratory.suspended_at,
    };
  }

  private validatePackageCode(packageCode: string): asserts packageCode is keyof typeof GRANULAR_SEED_PACKAGES {
    if (typeof packageCode !== 'string' || !Object.prototype.hasOwnProperty.call(GRANULAR_SEED_PACKAGES, packageCode)) {
      throw new BadRequestException('PLATFORM_PROVISIONING_SEED_PACKAGE_UNKNOWN');
    }
  }

  private validateSubscription(input: Record<string, unknown>, ownerId: number, update: boolean) {
    const status = input.subscription_status;
    if (!SUBSCRIPTION_STATUSES.includes(status as (typeof SUBSCRIPTION_STATUSES)[number])) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_STATUS_INVALID');
    }
    const planCode = typeof input.plan_code === 'string' ? input.plan_code.trim() : '';
    if (!planCode || planCode.length > 80) throw new BadRequestException('PLATFORM_SUBSCRIPTION_PLAN_REQUIRED');
    const serviceStartsAt = this.parseTimestamp(input.service_starts_at, true);
    const serviceExpiresAt = this.parseTimestamp(input.service_expires_at, status !== 'perpetual_free');
    const graceUntil = this.parseTimestamp(input.grace_until, false);
    if (serviceExpiresAt && serviceExpiresAt <= serviceStartsAt) throw new BadRequestException('PLATFORM_SUBSCRIPTION_DATES_INVALID');
    if (status === 'perpetual_free') {
      const reason = typeof input.perpetual_free_reason === 'string' ? input.perpetual_free_reason.trim() : '';
      if (!reason) throw new BadRequestException('PLATFORM_PERPETUAL_FREE_REASON_REQUIRED');
      if (serviceExpiresAt || graceUntil) throw new BadRequestException('PLATFORM_PERPETUAL_FREE_EXPIRY_FORBIDDEN');
    }
    if (graceUntil && (!serviceExpiresAt || graceUntil <= serviceExpiresAt)) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_GRACE_INVALID');
    }
    if (status === 'grace' && !graceUntil) throw new BadRequestException('PLATFORM_SUBSCRIPTION_GRACE_REQUIRED');
    return {
      subscriptionStatus: status,
      planCode,
      serviceStartsAt,
      serviceExpiresAt,
      graceUntil,
      perpetualFreeReason: typeof input.perpetual_free_reason === 'string' ? input.perpetual_free_reason.trim() : null,
      perpetualFreeGrantedAt: update ? input.perpetual_free_granted_at : null,
      perpetualFreeGrantedBy: ownerId,
    };
  }

  private appendSubscriptionAudit(
    assignments: string[],
    values: unknown[],
    validated: ReturnType<PlatformLaboratoryAdminService['validateSubscription']>,
    ownerId: number,
  ) {
    if (validated.subscriptionStatus === 'perpetual_free') {
      values.push(validated.perpetualFreeReason);
      assignments.push(`"perpetual_free_reason"=$${values.length}`);
      values.push(new Date().toISOString());
      assignments.push(`"perpetual_free_granted_at"=$${values.length}`);
      values.push(ownerId);
      assignments.push(`"perpetual_free_granted_by"=$${values.length}`);
    } else if (validated.perpetualFreeGrantedAt == null) {
      values.push(null);
      assignments.push(`"perpetual_free_granted_at"=$${values.length}`);
      values.push(null);
      assignments.push(`"perpetual_free_granted_by"=$${values.length}`);
    }
  }

  private parseTimestamp(value: unknown, required: boolean): Date | null {
    if (value == null || value === '') {
      if (required) throw new BadRequestException('PLATFORM_SUBSCRIPTION_DATE_REQUIRED');
      return null;
    }
    if (typeof value !== 'string' && !(value instanceof Date)) throw new BadRequestException('PLATFORM_SUBSCRIPTION_DATE_INVALID');
    const source = value instanceof Date ? value.toISOString() : value;
    if (typeof source !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(source)) {
      throw new BadRequestException('PLATFORM_SUBSCRIPTION_DATE_INVALID');
    }
    const timestamp = new Date(source);
    if (Number.isNaN(timestamp.getTime())) throw new BadRequestException('PLATFORM_SUBSCRIPTION_DATE_INVALID');
    return timestamp;
  }

  private requiredText(value: unknown, maxLength: number, code: string) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      throw new BadRequestException(code);
    }
    return value.trim();
  }

  private optionalText(value: unknown, maxLength: number) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > maxLength) {
      throw new BadRequestException('PLATFORM_LABORATORY_BRANCH_FIELD_INVALID');
    }
    return value.trim() || null;
  }

  private isForeignKeyError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23503';
  }

  private isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
