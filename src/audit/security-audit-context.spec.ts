import { ForbiddenException } from '@nestjs/common';
import { getSecurityAuditActorUserId } from './security-audit-context';

describe('getSecurityAuditActorUserId', () => {
  it('obtiene el actor exclusivamente del request autenticado', () => {
    expect(
      getSecurityAuditActorUserId({
        user: {
          userId: 7,
          username: 'admin',
        },
      }),
    ).toBe(7);
  });

  it('permite undefined solo para compatibilidad con llamadas unitarias directas', () => {
    expect(getSecurityAuditActorUserId(undefined)).toBeNull();
  });

  it.each([0, -1, 1.5, Number.NaN, undefined])(
    'rechaza actor invalido %s en un request real',
    (userId) => {
      expect(() =>
        getSecurityAuditActorUserId({
          user: { userId },
        }),
      ).toThrow(ForbiddenException);
    },
  );
});
