import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const GRANULAR_SEED_PACKAGES = {
  currencies: { sourcePackage: 'financial-and-payments', tables: ['currencies'], dependencies: [] },
  'sample-types': { sourcePackage: 'samples-and-tax', tables: ['sample_type'], dependencies: [] },
  taxes: { sourcePackage: 'samples-and-tax', tables: ['tax'], dependencies: [] },
  'exam-groups': { sourcePackage: 'exam-catalog', tables: ['exam_group'], dependencies: [] },
  exams: { sourcePackage: 'exam-catalog', tables: ['exam_catalog'], dependencies: ['exam-groups', 'sample-types', 'taxes'] },
  tariffs: { sourcePackage: 'tariffs', tables: ['tariffs', 'exam_tariff_prices'], dependencies: ['currencies', 'exams'] },
  antibiotics: { sourcePackage: 'microbiology', tables: ['antibiotic'], dependencies: [] },
  germs: { sourcePackage: 'microbiology', tables: ['list_germs'], dependencies: [] },
  'parasitic-forms': { sourcePackage: 'parasitology', tables: ['parasiticforms'], dependencies: [] },
  banks: { sourcePackage: 'financial-and-payments', tables: ['banks'], dependencies: [] },
  'payment-methods': { sourcePackage: 'financial-and-payments', tables: ['type_payment'], dependencies: ['currencies'] },
} as const;

export type GranularSeedPackage = keyof typeof GRANULAR_SEED_PACKAGES;

const LEGACY_SEED_PACKAGE_ALIASES: Record<string, readonly GranularSeedPackage[]> = {
  microbiology: ['antibiotics', 'germs'],
  parasitology: ['parasitic-forms'],
  'samples-and-tax': ['sample-types', 'taxes'],
  'exam-catalog': ['exam-groups', 'exams'],
  'financial-and-payments': ['currencies', 'banks', 'payment-methods'],
};

export interface CatalogSnapshot {
  packageCode: string;
  version: string;
  minimumSchemaVersion: string;
  tables: Record<string, Array<Record<string, unknown>>>;
  checksum?: string;
}

export function resolveGranularSeedPackages(requested: readonly string[]): GranularSeedPackage[] {
  const resolved: GranularSeedPackage[] = [];
  const included = new Set<GranularSeedPackage>();

  const add = (packageCode: GranularSeedPackage) => {
    if (included.has(packageCode)) return;
    for (const dependency of GRANULAR_SEED_PACKAGES[packageCode].dependencies) add(dependency);
    included.add(packageCode);
    resolved.push(packageCode);
  };

  add('currencies');
  for (const requestedCode of requested) {
    const packageCode = String(requestedCode).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(GRANULAR_SEED_PACKAGES, packageCode)) {
      add(packageCode as GranularSeedPackage);
      continue;
    }

    const children = Object.prototype.hasOwnProperty.call(LEGACY_SEED_PACKAGE_ALIASES, packageCode)
      ? LEGACY_SEED_PACKAGE_ALIASES[packageCode]
      : undefined;
    if (!children) throw new BadRequestException('PLATFORM_PROVISIONING_SEED_PACKAGE_UNKNOWN');
    for (const child of children) add(child);
  }
  return resolved;
}

export function stableCatalogJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableCatalogJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableCatalogJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function catalogChecksum(value: unknown): string {
  return createHash('sha256').update(stableCatalogJson(value), 'utf8').digest('hex').toUpperCase();
}

export function buildGranularSeedSnapshots(
  sourceSnapshots: Record<string, CatalogSnapshot>,
  version: string,
  minimumSchemaVersion: string,
): Array<CatalogSnapshot & { checksum: string }> {
  const assignedTables = new Set<string>();
  const snapshots = Object.entries(GRANULAR_SEED_PACKAGES).map(([packageCode, definition]) => {
    const source = sourceSnapshots[definition.sourcePackage];
    if (!source || source.packageCode !== definition.sourcePackage) {
      throw new BadRequestException('PLATFORM_CATALOG_INITIAL_SOURCE_PACKAGE_MISSING');
    }

    const tables: CatalogSnapshot['tables'] = {};
    for (const table of definition.tables) {
      if (assignedTables.has(table)) throw new BadRequestException('PLATFORM_CATALOG_INITIAL_TABLE_MAPPING_INVALID');
      const rows = source.tables?.[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new BadRequestException('PLATFORM_CATALOG_INITIAL_SOURCE_TABLE_MISSING');
      }
      assignedTables.add(table);
      tables[table] = rows;
    }

    const payload = { packageCode, version, minimumSchemaVersion, tables };
    return { ...payload, checksum: catalogChecksum(payload) };
  });

  const sourceTables = Object.values(sourceSnapshots).flatMap(snapshot => Object.keys(snapshot.tables ?? {}));
  if (sourceTables.length !== assignedTables.size || sourceTables.some(table => !assignedTables.has(table))) {
    throw new BadRequestException('PLATFORM_CATALOG_INITIAL_TABLE_MAPPING_INVALID');
  }
  return snapshots;
}
