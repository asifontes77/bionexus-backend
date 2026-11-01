import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

interface CatalogSnapshot {
  packageCode: string;
  version: string;
  minimumSchemaVersion: string;
  tables: Record<string, Array<Record<string, unknown>>>;
}

@Injectable()
export class PlatformCatalogMaterializerService {
  private readonly supportedTables = new Set([
    'antibiotic','list_germs','parasiticforms','sample_type','exam_group','exam_catalog',
    'currencies','tax','tariffs','banks','type_payment','exam_tariff_prices',
  ]);

  private readonly insertionOrder = [
    'antibiotic','list_germs','parasiticforms','sample_type','exam_group','currencies','tax',
    'banks','type_payment','exam_catalog','tariffs','exam_tariff_prices',
  ];

  async materializeGlobal(manager: EntityManager, release: Record<string, unknown>) {
    const snapshot = release.snapshot_payload as CatalogSnapshot;
    this.validateSnapshot(snapshot, String(release.package_code));
    const maps = new Map<string, Map<number, number>>();
    let materializedRows = 0;

    for (const table of this.insertionOrder) {
      const rows = snapshot.tables?.[table];
      if (!rows) continue;
      const map = new Map<number, number>();
      maps.set(table, map);
      for (const source of rows) {
        const sourceId = Number(source.id);
        if (!Number.isInteger(sourceId) || sourceId <= 0) throw new BadRequestException('PLATFORM_CATALOG_SOURCE_ID_INVALID');
        const existing = await manager.query(`SELECT id FROM "${table}" WHERE laboratory_id IS NULL AND source_global_id=$1 LIMIT 1`, [sourceId]);
        if (existing[0]) { map.set(sourceId, Number(existing[0].id)); continue; }
        const values = await this.prepareGlobalRow(manager, table, source, maps);
        const physicalRows = await manager.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1`,
          [table],
        );
        const physicalColumns = new Set(physicalRows.map((row: { column_name: string }) => row.column_name));
        const filteredValues = Object.fromEntries(Object.entries(values).filter(([column]) => physicalColumns.has(column)));
        const columns = Object.keys(filteredValues);
        const parameters = Object.values(filteredValues);
        const placeholders = parameters.map((_, index) => `$${index + 1}`).join(',');
        const quoted = columns.map(column => `"${column}"`).join(',');
        const inserted = await manager.query(`INSERT INTO "${table}" (${quoted}) VALUES (${placeholders}) RETURNING id`, parameters);
        map.set(sourceId, Number(inserted[0].id));
        materializedRows += 1;
      }
    }
    return { packageCode: snapshot.packageCode, materializedRows, maps };
  }

  private async prepareGlobalRow(manager: EntityManager, table: string, source: Record<string, unknown>, maps: Map<string, Map<number, number>>) {
    const row: Record<string, unknown> = {};
    for (const [column, value] of Object.entries(source)) {
      if (column === 'id' || column === 'laboratory_id' || column === 'laboratory_branch_id') continue;
      row[column] = value;
    }
    row.laboratory_id = null;
    row.source_global_id = Number(source.id);
    row.is_platform_managed = true;
    if (table === 'exam_catalog') {
      row.group_id = await this.mapRequired(manager, maps, 'exam_group', source.group_id, 'exam_catalog.group_id');
      row.tax_id = await this.mapNullable(manager, maps, 'tax', source.tax_id, 'exam_catalog.tax_id');
    }
    if (table === 'tariffs') row.currency_id = await this.mapRequired(manager, maps, 'currencies', source.currency_id, 'tariffs.currency_id');
    if (table === 'exam_tariff_prices') {
      row.tariff_id = await this.mapRequired(manager, maps, 'tariffs', source.tariff_id, 'exam_tariff_prices.tariff_id');
      row.exam_catalog_id = await this.mapRequired(manager, maps, 'exam_catalog', source.exam_catalog_id, 'exam_tariff_prices.exam_catalog_id');
    }
    return row;
  }

  private async mapRequired(manager: EntityManager, maps: Map<string, Map<number, number>>, table: string, sourceId: unknown, relation: string) {
    const id = Number(sourceId);
    const inMemory = maps.get(table)?.get(id);
    if (inMemory) return inMemory;
    const rows = await manager.query(`SELECT id FROM "${table}" WHERE laboratory_id IS NULL AND source_global_id=$1 LIMIT 1`, [id]);
    const persisted = Number(rows[0]?.id);
    if (!persisted) throw new ConflictException(`PLATFORM_CATALOG_RELATION_NOT_MATERIALIZED:${relation}:${sourceId}`);
    return persisted;
  }

  private async mapNullable(manager: EntityManager, maps: Map<string, Map<number, number>>, table: string, sourceId: unknown, relation: string) {
    if (sourceId === null || sourceId === undefined) return null;
    return this.mapRequired(manager, maps, table, sourceId, relation);
  }

  private validateSnapshot(snapshot: CatalogSnapshot, packageCode: string) {
    if (!snapshot || snapshot.packageCode !== packageCode || !snapshot.tables) throw new BadRequestException('PLATFORM_CATALOG_SNAPSHOT_INVALID');
    for (const table of Object.keys(snapshot.tables)) {
      if (!this.supportedTables.has(table)) throw new BadRequestException(`PLATFORM_CATALOG_TABLE_NOT_SUPPORTED:${table}`);
    }
  }
}
