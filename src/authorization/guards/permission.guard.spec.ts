import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';
import { AuthorizationService } from '../authorization.service';
import {
  REQUIRED_PERMISSIONS_KEY,
  RequirePermissions,
} from '../decorators/require-permissions.decorator';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let reflector: {
    getAllAndOverride: jest.Mock;
  };

  let authorizationService: {
    hasAllPermissions: jest.Mock;
  };

  let guard: PermissionGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    authorizationService = {
      hasAllPermissions: jest.fn(),
    };

    guard = new PermissionGuard(
      reflector as unknown as Reflector,
      authorizationService as unknown as AuthorizationService,
    );
  });

  it('permite una ruta sin permisos declarados', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      guard.canActivate(createContext(1)),
    ).resolves.toBe(true);

    expect(
      authorizationService.hasAllPermissions,
    ).not.toHaveBeenCalled();
  });

  it('permite una lista de permisos declarados vacia', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    await expect(
      guard.canActivate(createContext(1)),
    ).resolves.toBe(true);

    expect(
      authorizationService.hasAllPermissions,
    ).not.toHaveBeenCalled();
  });

  it('delega todos los permisos requeridos al servicio', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'security.users.read',
      'security.users.update',
    ]);

    authorizationService.hasAllPermissions.mockResolvedValue(true);

    await expect(
      guard.canActivate(createContext(7)),
    ).resolves.toBe(true);

    expect(
      authorizationService.hasAllPermissions,
    ).toHaveBeenCalledTimes(1);

    expect(
      authorizationService.hasAllPermissions,
    ).toHaveBeenCalledWith(
      7,
      [
        'security.users.read',
        'security.users.update',
      ],
    );
  });

  it('deniega cuando el servicio no concede los permisos', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'security.users.update',
    ]);

    authorizationService.hasAllPermissions.mockResolvedValue(false);

    await expect(
      guard.canActivate(createContext(4)),
    ).resolves.toBe(false);
  });

  it('deniega cuando request.user no existe', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'security.users.read',
    ]);

    await expect(
      guard.canActivate(createContext(undefined)),
    ).resolves.toBe(false);

    expect(
      authorizationService.hasAllPermissions,
    ).not.toHaveBeenCalled();
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
  ])(
    'deniega un identificador de usuario invalido: %s',
    async (userId) => {
      reflector.getAllAndOverride.mockReturnValue([
        'security.users.read',
      ]);

      await expect(
        guard.canActivate(createContext(userId)),
      ).resolves.toBe(false);

      expect(
        authorizationService.hasAllPermissions,
      ).not.toHaveBeenCalled();
    },
  );

  it('consulta metadatos del metodo antes que del controlador', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const handler = jest.fn();
    class TestController {}

    const context = createContext(
      1,
      handler,
      TestController,
    );

    await guard.canActivate(context);

    expect(
      reflector.getAllAndOverride,
    ).toHaveBeenCalledWith(
      REQUIRED_PERMISSIONS_KEY,
      [
        handler,
        TestController,
      ],
    );
  });
});

describe('RequirePermissions', () => {
  it('normaliza, elimina vacios y evita duplicados', () => {
    class TestController {
      @RequirePermissions(
        ' Security.Users.Read ',
        'security.users.read',
        '',
        'SECURITY.USERS.UPDATE',
      )
      testMethod() {
        return true;
      }
    }

    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      TestController.prototype.testMethod,
    );

    expect(permissions).toEqual([
      'security.users.read',
      'security.users.update',
    ]);
  });

  it('permite declarar permisos en un controlador', () => {
    @RequirePermissions('security.roles.read')
    class TestController {}

    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      TestController,
    );

    expect(permissions).toEqual([
      'security.roles.read',
    ]);
  });
});

function createContext(
  userId?: number,
  handler: (...args: unknown[]) => unknown = jest.fn(),
  controller: new (...args: never[]) => unknown = class {},
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({
        user:
          userId === undefined
            ? undefined
            : {
                userId,
                username: 'test-user',
              },
      }),
    }),
  } as unknown as ExecutionContext;
}
