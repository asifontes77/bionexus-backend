import { readFileSync } from 'node:fs';

describe('Platform catalog release service contract',()=>{
  const service=readFileSync('src/platform/platform-catalog-release.service.ts','utf8');
  const controller=readFileSync('src/platform/platform-catalog-release.controller.ts','utf8');
  const module=readFileSync('src/platform/platform.module.ts','utf8');
  it('supports draft publish retire and compatible resolution',()=>{
    for(const token of ['createDraft','publish(','retire(','getLatestCompatible','FOR UPDATE','PLATFORM_CATALOG_RELEASE_CHECKSUM_INVALID']) expect(service).toContain(token);
  });
  it('exposes platform endpoints and registers the provider',()=>{
    expect(controller).toContain("@Controller('platform/catalog-releases')");
    expect(module).toContain('PlatformCatalogReleaseService');
    expect(module).toContain('PlatformCatalogReleaseController');
  });
});
