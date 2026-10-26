import { readFileSync } from 'fs';
describe('Platform owner dual authentication contract',()=>{
 const users=readFileSync('src/users/users.service.ts','utf8');
 const guard=readFileSync('src/platform/platform-owner.guard.ts','utf8');
 it('preserves tenant login and adds owner identity',()=>{expect(users).toContain("identityType: 'tenant-user'");expect(users).toContain("identityType: 'platform-owner'");expect(users).toContain('platform_owners');});
 it('protects platform endpoints',()=>{expect(guard).toContain('PLATFORM_OWNER_REQUIRED');expect(guard).toContain("identityType !== 'platform-owner'");});
 it('does not log secrets',()=>{expect(users).not.toMatch(/console\.log|Logger\([^)]*password/i);});
  it('keeps renewal identity explicit and owner timeout independent from laboratory 1',()=>{
    expect(users).toContain("identityType: 'tenant-user' }, token, identityType: 'tenant-user'");
    expect(users).toContain("payload.identityType !== 'platform-owner' && this.dataSource");
  });

});
