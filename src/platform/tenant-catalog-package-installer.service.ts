import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PlatformCatalogReleaseService } from './platform-catalog-release.service';

interface PackageDefinition {
  tables: string[];
}

@Injectable()
export class TenantCatalogPackageInstallerService {
  private readonly schemaVersion = 'BioNexusBaseline1790366400000';
  private readonly packages: Record<string, PackageDefinition> = {
    microbiology: { tables: ['antibiotic', 'list_germs'] },
    parasitology: { tables: ['parasiticforms'] },
    'samples-and-tax': { tables: ['sample_type', 'tax'] },
    'exam-catalog': { tables: ['exam_group', 'exam_catalog'] },
    'financial-and-payments': { tables: ['currencies', 'banks', 'type_payment'] },
    tariffs: { tables: ['tariffs', 'exam_tariff_prices'] },
  };

  constructor(private readonly releases: PlatformCatalogReleaseService) {}

  async installSelected(manager: EntityManager, laboratoryId: number, packageCodes: string[], installedBy: number | null) {
    if (!Number.isInteger(laboratoryId) || laboratoryId <= 0) throw new BadRequestException('PLATFORM_PROVISIONING_LABORATORY_INVALID');
    const selected = [...new Set((packageCodes ?? []).map(value => String(value).trim().toLowerCase()).filter(Boolean))];
    for (const packageCode of selected) if (!this.packages[packageCode]) throw new BadRequestException(`PLATFORM_PROVISIONING_SEED_PACKAGE_INVALID:${packageCode}`);

    const installed: Array<Record<string, unknown>> = [];
    for (const packageCode of selected) {
      const release = await this.releases.getLatestCompatible(packageCode, this.schemaVersion, manager);
      const existing = await manager.query(
        `SELECT id,catalog_release_id,installed_version,source_checksum,installation_status FROM laboratory_catalog_packages WHERE laboratory_id=$1 AND package_code=$2 FOR UPDATE`,
        [laboratoryId, packageCode],
      );
      if (existing[0]) {
        if (existing[0].catalog_release_id !== release.id || existing[0].source_checksum !== release.checksum) {
          throw new ConflictException(`PLATFORM_PROVISIONING_SEED_PACKAGE_ALREADY_INSTALLED:${packageCode}`);
        }
        installed.push(existing[0]);
        continue;
      }

      for (const table of this.packages[packageCode].tables) await this.copyTable(manager, table, laboratoryId);
      const rows = await manager.query(
        `INSERT INTO laboratory_catalog_packages (laboratory_id,package_code,catalog_release_id,installed_version,source_checksum,installation_status,installed_at,installed_by,last_checked_at) VALUES ($1,$2,$3,$4,$5,'installed',now(),$6,now()) RETURNING id,package_code AS "packageCode",installed_version AS "installedVersion",source_checksum AS "sourceChecksum",installation_status AS "installationStatus"`,
        [laboratoryId, packageCode, release.id, release.version, release.checksum, installedBy],
      );
      installed.push(rows[0]);
    }
    return installed;
  }

  private async copyTable(manager: EntityManager, table: string, laboratoryId: number) {
    const columns = await manager.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND column_name NOT IN ('id','laboratory_id','laboratory_branch_id','source_global_id','is_platform_managed') ORDER BY ordinal_position`,
      [table],
    );
    const names = columns.map((row: { column_name: string }) => row.column_name);
    const target = ['laboratory_id','source_global_id','is_platform_managed',...names];
    const expressions = ['$1','template.source_global_id','true',...names.map((column: string) => this.expression(table, column))];
    const quotedTarget = target.map(column => `"${column}"`).join(',');
    const sql = `INSERT INTO "${table}" (${quotedTarget}) SELECT ${expressions.join(',')} FROM "${table}" template WHERE template.laboratory_id IS NULL AND template.is_platform_managed=true AND NOT EXISTS (SELECT 1 FROM "${table}" tenant WHERE tenant.laboratory_id=$1 AND tenant.source_global_id=template.source_global_id)`;
    await manager.query(sql, [laboratoryId]);
  }

  private expression(table: string, column: string) {
    const relations: Record<string, Record<string, string>> = {
      exam_catalog: { group_id: 'exam_group', tax_id: 'tax' },
      tariffs: { currency_id: 'currencies' },
      exam_tariff_prices: { tariff_id: 'tariffs', exam_catalog_id: 'exam_catalog' },
    };
    const parent = relations[table]?.[column];
    if (!parent) return `template."${column}"`;
    return `(SELECT tenant_parent.id FROM "${parent}" tenant_parent WHERE tenant_parent.laboratory_id=$1 AND tenant_parent.source_global_id=(SELECT global_parent.source_global_id FROM "${parent}" global_parent WHERE global_parent.id=template."${column}" AND global_parent.laboratory_id IS NULL AND global_parent.is_platform_managed=true))`;
  }
}
