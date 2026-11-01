import { readFileSync } from 'node:fs';

describe('Hybrid catalog source identity contract',()=>{
  const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
  it('permits platform-managed global rows with stable external identity',()=>{
    expect(baseline).toContain('IF NEW.laboratory_id IS NULL THEN');
    expect(baseline).toContain('HYBRID_CATALOG_GLOBAL_MUST_BE_PLATFORM_MANAGED');
  });
  it('validates tenant provenance by source identity, not physical PK',()=>{
    expect(baseline).toContain('source.source_global_id = $1');
    expect(baseline).not.toContain('source.id = NEW.source_global_id');
  });
  it('contains no ADD or DROP source_global FK in UP or DOWN',()=>{
    const sql=[...baseline.matchAll(/queryRunner\.query\(`([\s\S]*?)`\);/g)].map(match=>match[1]);
    const incompatible=sql.filter(value=>/source_global/i.test(value) && ((/ADD CONSTRAINT/i.test(value) && /FOREIGN KEY/i.test(value)) || /DROP CONSTRAINT/i.test(value)));
    expect(incompatible).toEqual([]);
  });
});
