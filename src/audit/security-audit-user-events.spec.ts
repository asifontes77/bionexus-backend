import { readFileSync } from 'fs';
import { join } from 'path';

describe('user security audit events', () => {
  const source = readFileSync(join(process.cwd(), 'src/users/users.service.ts'), 'utf8');
  it.each([
    'security.user.created',
    'security.user.updated',
    'security.user.activated',
    'security.user.deactivated',
  ])('declara %s', (eventName) => expect(source).toContain(eventName));
  it('excluye campos sensibles de changedFields', () => {
    expect(source).toContain("'passwordSignature'");
    expect(source).toContain("'key_signing'");
    expect(source).toContain("'key_recover'");
    expect(source).toContain('!forbidden.has(field)');
  });
  it('escribe con el mismo manager', () => {
    expect(source).toContain('this.securityAuditService.write(manager');
  });
});
