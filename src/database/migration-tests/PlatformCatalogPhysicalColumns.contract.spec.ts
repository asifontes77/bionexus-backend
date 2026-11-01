import { readFileSync } from 'node:fs';

describe('Platform catalog physical columns contract', () => {
  const service=readFileSync('src/platform/platform-catalog-materializer.service.ts','utf8');
  it('filters snapshot metadata against the real PostgreSQL table columns',()=>{
    expect(service).toContain('information_schema.columns');
    expect(service).toContain('physicalColumns.has(column)');
    expect(service).toContain('Object.entries(values).filter');
  });
  it('keeps required hybrid columns in the filtered row',()=>{
    expect(service).toContain('row.laboratory_id = null');
    expect(service).toContain('row.source_global_id');
    expect(service).toContain('row.is_platform_managed = true');
  });
});
