import * as fs from 'fs';
import * as path from 'path';
const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');
describe('Session JWT single duration source',()=>{
  const security=read('src/security/security.module.ts');
  const users=read('src/users/users.service.ts');
  it('does not impose a global fixed expiration',()=>{
    expect(security).toContain('JwtModule.register');
    expect(security).not.toContain("expiresIn: '20h'");
    expect(security).not.toContain('signOptions: { expiresIn:');
  });
  it('signs login and renewal from laboratory policy',()=>{
    expect(users).toContain('session_timeout_minutes');
    expect(users).toContain('signSessionToken(payload)');
    expect(users).toContain('expiresIn: `${timeoutMinutes}m`');
  });
});
