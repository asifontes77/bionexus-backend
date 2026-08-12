import { resolveFirstAdminInput } from './bootstrap-first-admin';

describe('resolveFirstAdminInput', () => {
  const validEnvironment = {
    TORO_ADMIN_USERNAME: 'admin.initial',
    TORO_ADMIN_PASSWORD: 'StrongPassword1!',
    TORO_ADMIN_NAME: 'Administrador Inicial',
    TORO_ADMIN_TELEPHONE: '0000000000',
    TORO_ADMIN_EMAIL: 'ADMIN@EXAMPLE.COM',
  };

  it('normalizes safe bootstrap input without exposing the password', () => {
    const result = resolveFirstAdminInput(validEnvironment);
    expect(result).toEqual({
      username: 'admin.initial',
      password: 'StrongPassword1!',
      name: 'Administrador Inicial',
      telephone: '0000000000',
      email: 'admin@example.com',
    });
  });

  it.each([
    ['TORO_ADMIN_USERNAME', { TORO_ADMIN_USERNAME: '' }],
    ['TORO_ADMIN_PASSWORD', { TORO_ADMIN_PASSWORD: '' }],
    ['TORO_ADMIN_NAME', { TORO_ADMIN_NAME: '' }],
    ['TORO_ADMIN_TELEPHONE', { TORO_ADMIN_TELEPHONE: '' }],
  ])('rejects missing %s', (_name, override) => {
    expect(() =>
      resolveFirstAdminInput({ ...validEnvironment, ...override }),
    ).toThrow();
  });

  it.each([
    'short',
    'alllowercase1!',
    'ALLUPPERCASE1!',
    'NoNumberSymbol!',
    'NoSymbol12345',
  ])('rejects weak password without logging it', (password) => {
    expect(() =>
      resolveFirstAdminInput({
        ...validEnvironment,
        TORO_ADMIN_PASSWORD: password,
      }),
    ).toThrow();
  });

  it('allows an omitted email', () => {
    const result = resolveFirstAdminInput({
      ...validEnvironment,
      TORO_ADMIN_EMAIL: undefined,
    });
    expect(result.email).toBeNull();
  });
});
