import { ForbiddenException } from '@nestjs/common';
import {
  getSecurityAuditActorUserId,
  getSecurityAuditHttpContext,
} from './security-audit-context';

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
  it('captura IP y User-Agent del request autenticado', () => {
    getSecurityAuditActorUserId({
      user: { userId: 7 },
      ip: '127.0.0.1',
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'user-agent': 'TORO regression test',
      },
    });

    expect(getSecurityAuditHttpContext()).toEqual({
      ipAddress: '203.0.113.10',
      userAgent: 'TORO regression test',
    });
  });

});
