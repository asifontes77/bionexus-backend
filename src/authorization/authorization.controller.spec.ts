import {
  ForbiddenException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationContext } from './models/authorization-context';
import { AuthorizationController } from './authorization.controller';
import { AuthorizationService } from './authorization.service';
import { JwtUserGuard } from '../users/jwt-user.guard';

describe('AuthorizationController', () => {
  let controller: AuthorizationController;
  let authorizationService: {
    resolveContext: jest.Mock;
  };

  beforeEach(() => {
    authorizationService = {
      resolveContext: jest.fn(),
    };

    controller = new AuthorizationController(
      authorizationService as unknown as AuthorizationService,
    );
  });

  it('devuelve el contexto efectivo del usuario autenticado', async () => {
    const context: AuthorizationContext = {
      userId: 7,
      roles: ['admin'],
      permissions: [
        'security.permissions.read',
        'security.roles.read',
      ],
      deniedPermissions: [],
    };

    authorizationService.resolveContext.mockResolvedValue(
      context,
    );

    await expect(
      controller.getCurrentContext({
        user: {
          userId: 7,
          username: 'test-user',
        },
      }),
    ).resolves.toEqual(context);

    expect(
      authorizationService.resolveContext,
    ).toHaveBeenCalledTimes(1);

    expect(
      authorizationService.resolveContext,
    ).toHaveBeenCalledWith(7);
  });

  it('rechaza una solicitud sin identidad autenticada', async () => {
    await expect(
      controller.getCurrentContext({}),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      authorizationService.resolveContext,
    ).not.toHaveBeenCalled();
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
  ])(
    'rechaza un identificador invalido: %s',
    async (userId) => {
      await expect(
        controller.getCurrentContext({
          user: {
            userId,
          },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        authorizationService.resolveContext,
      ).not.toHaveBeenCalled();
    },
  );

  it('rechaza un usuario sin contexto disponible', async () => {
    authorizationService.resolveContext.mockResolvedValue(
      null,
    );

    await expect(
      controller.getCurrentContext({
        user: {
          userId: 8,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      authorizationService.resolveContext,
    ).toHaveBeenCalledWith(8);
  });

  it('protege el endpoint con JwtUserGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthorizationController.prototype.getCurrentContext,
    );

    expect(guards).toContain(JwtUserGuard);
  });
});
