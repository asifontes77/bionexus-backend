import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildGranularSeedSnapshots,
  catalogChecksum,
  resolveGranularSeedPackages,
} from './seed-package-catalog';

describe('Granular approved seed packages', () => {
  const root = resolve('src/database/seed-data/releases/1.0.0');
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));

  it('expands dependencies before selected packages and always includes currencies for VES', () => {
    expect(resolveGranularSeedPackages(['tariffs'])).toEqual([
      'currencies','exam-groups','sample-types','taxes','exams','tariffs',
    ]);
    expect(resolveGranularSeedPackages(['payment-methods'])).toEqual(['currencies','payment-methods']);
    expect(resolveGranularSeedPackages([])).toEqual(['currencies']);
  });

  it('keeps legacy aliases limited to approved atoms without redundant aggregate installs', () => {
    expect(resolveGranularSeedPackages(['microbiology'])).toEqual(['currencies','antibiotics','germs']);
    expect(resolveGranularSeedPackages(['exam-catalog', 'exams'])).toEqual([
      'currencies','exam-groups','sample-types','taxes','exams',
    ]);
    expect(resolveGranularSeedPackages(['financial-and-payments'])).toEqual([
      'currencies','banks','payment-methods',
    ]);
  });

  it.each(['routines','worksheet-groups','worksheet-items','reference-laboratories','special-tests','routines-and-worksheets'])(
    'rejects unapproved package %s',
    packageCode => {
      expect(() => resolveGranularSeedPackages([packageCode])).toThrow('PLATFORM_PROVISIONING_SEED_PACKAGE_UNKNOWN');
    },
  );

  it('derives stable checksums from source snapshots and preserves the approved tariff-price unit', () => {
    const sourceSnapshots = Object.fromEntries(manifest.packages.map((item: { packageCode: string; file: string }) => [
      item.packageCode,
      JSON.parse(readFileSync(resolve(root, item.file), 'utf8')),
    ]));
    const snapshots = buildGranularSeedSnapshots(sourceSnapshots, manifest.releaseVersion, manifest.minimumSchemaVersion);
    const tariffSnapshot = snapshots.find(snapshot => snapshot.packageCode === 'tariffs');

    expect(snapshots).toHaveLength(11);
    for (const snapshot of snapshots) {
      const { checksum, ...payload } = snapshot;
      expect(checksum).toBe(catalogChecksum(payload));
    }
    expect(tariffSnapshot?.tables).toHaveProperty('tariffs');
    expect(tariffSnapshot?.tables).toHaveProperty('exam_tariff_prices');
  });
});
