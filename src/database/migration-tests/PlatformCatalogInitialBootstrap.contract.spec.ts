import { readFileSync } from 'node:fs';

describe('Platform catalog initial bootstrap contract', () => {
  const service = readFileSync('src/platform/platform-catalog-release.service.ts', 'utf8');
  const controller = readFileSync('src/platform/platform-catalog-release.controller.ts', 'utf8');

  it('protects every catalog release endpoint with the platform-owner guards', () => {
    expect(controller).toContain('@UseGuards(JwtUserGuard, PlatformOwnerGuard)');
    expect(controller).toContain("@Post('bootstrap-initial')");
  });

  it('derives and registers granular releases from the six approved source snapshots transactionally', () => {
    for (const token of ['bootstrapInitialReleases','manifest.packages.length !== 6','buildGranularSeedSnapshots','catalogChecksum(payload)','this.dataSource.transaction','PLATFORM_CATALOG_INITIAL_RELEASE_CONFLICT','PLATFORM_CATALOG_INITIAL_CHECKSUM_INVALID']) {
      expect(service).toContain(token);
    }
  });

  it('publishes immutable snapshots without embedding the checksum in snapshot_payload', () => {
    expect(service).toContain('const snapshotPayload = {');
    expect(service).toContain('tables: document.tables');
    expect(service).toContain("VALUES ($1,$2,'published'");
    expect(service).toContain('published_by,created_by');
  });
});
