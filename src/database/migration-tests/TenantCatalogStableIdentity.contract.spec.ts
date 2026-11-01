import { readFileSync } from 'node:fs';

describe('Tenant catalog stable identity contract',()=>{
 const service=readFileSync('src/platform/tenant-catalog-package-installer.service.ts','utf8');
 it('copies stable source identity rather than the global physical PK',()=>{
  expect(service).toContain("'template.source_global_id'");
  expect(service).toContain('tenant.source_global_id=template.source_global_id');
  expect(service).not.toContain("'template.id'");
  expect(service).not.toContain('tenant.source_global_id=template.id');
 });
 it('remaps global physical foreign keys through global stable identity to tenant parent IDs',()=>{
  expect(service).toContain('global_parent.id=template."${column}"');
  expect(service).toContain('global_parent.source_global_id');
  expect(service).toContain('tenant_parent.source_global_id=(SELECT global_parent.source_global_id');
  for(const relation of ['group_id','tax_id','currency_id','tariff_id','exam_catalog_id'])expect(service).toContain(relation);
 });
});
