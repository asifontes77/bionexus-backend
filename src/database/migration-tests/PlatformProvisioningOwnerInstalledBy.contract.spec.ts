import { readFileSync } from 'node:fs';

describe('Platform provisioning owner installed_by contract',()=>{
 const controller=readFileSync('src/platform/platform.controller.ts','utf8');
 const service=readFileSync('src/platform/platform-provisioning.service.ts','utf8');
 const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
 it('propagates the authenticated platform owner from the protected controller',()=>{
  expect(controller).toContain('@UseGuards(JwtUserGuard, PlatformOwnerGuard)');
  expect(controller).toContain('request.user?.id');
  expect(controller).toContain('this.provisioning.provision(body,platformOwnerId)');
 });
 it('uses the platform owner as installed_by and keeps the laboratory administrator separate',()=>{
  expect(service).toContain('platformOwnerId: number');
  expect(service).toContain('dto.seedPackages, platformOwnerId');
  expect(service).toContain('INSERT INTO users');
  expect(baseline).toContain('FOREIGN KEY ("installed_by") REFERENCES "platform_owners"("id") ON DELETE SET NULL');
 });
});
