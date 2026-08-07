import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { AuthorizationController } from './authorization.controller';
import { AuthorizationService } from './authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from './decorators/require-permissions.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';

describe('AuthorizationController role administration', () => {
  let controller: AuthorizationController;

  let administrationService: {
    getRoles: jest.Mock;
    createRole: jest.Mock;
  };

  beforeEach(() => {
    administrationService = {
      getRoles: jest.fn(),
      createRole: jest.fn(),
    };

    controller = new AuthorizationController(
      {
        resolveContext: jest.fn(),
      } as unknown as AuthorizationService,
      administrationService as unknown as AuthorizationAdministrationService,
    );
  });

  it('delega el listado de roles', async () => {
    const roles = [
      {
        id: 1,
        code: 'admin',
        name: 'Administrador',
        description: null,
        isSystem: true,
        isActive: true,
      },
    ];

    administrationService.getRoles.mockResolvedValue(roles);

    await expect(
      controller.getRoles(),
    ).resolves.toEqual(roles);

    expect(
      administrationService.getRoles,
    ).toHaveBeenCalledTimes(1);
  });

  it('delega la creacion de un rol', async () => {
    const body = {
      code: 'supervisor',
      name: 'Supervisor',
      description: 'Supervision operativa',
    };

    const createdRole = {
      id: 4,
      ...body,
      isSystem: false,
      isActive: true,
    };

    administrationService.createRole.mockResolvedValue(
      createdRole,
    );

    await expect(
      controller.createRole(body),
    ).resolves.toEqual(createdRole);

    expect(
      administrationService.createRole,
    ).toHaveBeenCalledWith(body);
  });

  it('registra el listado como GET roles', () => {
    const method =
      AuthorizationController.prototype.getRoles;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('roles');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.GET);
  });

  it('registra la creacion como POST roles', () => {
    const method =
      AuthorizationController.prototype.createRole;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('roles');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.POST);
  });

  it.each([
    ['getRoles', 'security.roles.read'],
    ['createRole', 'security.roles.create'],
  ] as const)(
    'protege %s con JWT y %s',
    (methodName, expectedPermission) => {
      const method =
        AuthorizationController.prototype[methodName];

      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        method,
      );

      const permissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        method,
      );

      expect(guards).toContain(JwtUserGuard);
      expect(guards).toContain(PermissionGuard);
      expect(permissions).toEqual([
        expectedPermission,
      ]);
    },
  );
});
