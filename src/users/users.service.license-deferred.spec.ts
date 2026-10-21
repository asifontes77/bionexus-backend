import { readFileSync } from 'node:fs';

describe('UsersService deferred License Manager contract', () => {
  const source = readFileSync('src/users/users.service.ts', 'utf8');
  const loginStart = source.indexOf('async getUserSession');
  const loginEnd = source.indexOf('async renewUserSession', loginStart);
  const loginSource = source.slice(loginStart, loginEnd);

  it('does not enforce license validation while License Manager is deferred', () => {
    expect(loginStart).toBeGreaterThanOrEqual(0);
    expect(loginEnd).toBeGreaterThan(loginStart);
    expect(loginSource).not.toContain('validateLicenseKey(');
    expect(loginSource).not.toContain('INVALID_LICENSE_KEY');
    expect(loginSource).toContain('License Manager remains intentionally outside the current Bio Nexus scope.');
    expect(loginSource).toContain('this.usersRepository.findOne');
    expect(loginSource).toContain('bcrypt.compareSync');
  });
});
