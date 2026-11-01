import { readFileSync } from 'node:fs';

describe('Platform catalog bootstrap materialization contract', () => {
  const release = readFileSync('src/platform/platform-catalog-release.service.ts', 'utf8');
  const materializer = readFileSync('src/platform/platform-catalog-materializer.service.ts', 'utf8');

  it('materializes every initial package inside the same bootstrap transaction', () => {
    expect(release).toContain('private readonly materializer: PlatformCatalogMaterializerService');
    expect((release.match(/materializer\.materializeGlobal\(manager/g) ?? []).length).toBe(2);
    expect(release).toContain('this.dataSource.transaction');
  });

  it('materializes an existing identical release too, keeping reruns idempotent', () => {
    const existing = release.indexOf('if (existing[0])');
    const materialize = release.indexOf('this.materializer.materializeGlobal(manager', existing);
    const continuation = release.indexOf('continue;', existing);
    expect(existing).toBeGreaterThanOrEqual(0);
    expect(materialize).toBeGreaterThan(existing);
    expect(materialize).toBeLessThan(continuation);
  });

  it('resolves relations persisted by previous packages in manifest order', () => {
    expect(materializer).toContain('private async mapRequired(manager: EntityManager');
    expect(materializer).toContain('laboratory_id IS NULL AND source_global_id=$1');
    expect(materializer).toContain('await this.prepareGlobalRow(manager');
  });

  it('keeps branch scope out of global materialization', () => {
    expect(materializer).toContain("column === 'laboratory_branch_id'");
    expect(materializer).not.toContain('row.laboratory_branch_id');
  });
});
