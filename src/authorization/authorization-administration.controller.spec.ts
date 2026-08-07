import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { AuthorizationController } from './authorization.controller';
import { SecurityPermissionEffect } from './entities/security-user-permission-override.entity';
import { AuthorizationService } from './authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from './decorators/require-permissions.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';

describe('AuthorizationController role administration', () => {
  let controller: AuthorizationController;

  let administrationService: {
    getPermissions: jest.Mock;
    getRoles: jest.Mock;
    createRole: jest.Mock;
    updateRole: jest.Mock;
    replaceRolePermissions: jest.Mock;
    getUserAuthorization: jest.Mock;
    replaceUserRoles: jest.Mock;
    replaceUserPermissionOverrides: jest.Mock;
  };

  beforeEach(() => {
    administrationService = {
      getPermissions: jest.fn(),
      getRoles: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      replaceRolePermissions: jest.fn(),
      getUserAuthorization: jest.fn(),
      replaceUserRoles: jest.fn(),
      replaceUserPermissionOverrides: jest.fn(),
    };

    controller = new AuthorizationController(
      {
        resolveContext: jest.fn(),
      } as unknown as AuthorizationService,
      administrationService as unknown as AuthorizationAdministrationService,
    );
  });

  it('delega el reemplazo de overrides del usuario', async () => {
    const body = {
      overrides: [
        {
          permissionId: 10,
          effect: SecurityPermissionEffect.Allow,
        },
        {
          permissionId: 11,
          effect: SecurityPermissionEffect.Deny,
        },
      ],
    };

    const result = [
      {
        permission: {
          id: 10,
          code: 'security.users.read',
          name: 'Consultar usuarios',
          description: null,
          module: 'security',
          isActive: true,
        },
        effect: SecurityPermissionEffect.Allow,
      },
      {
        permission: {
          id: 11,
          code: 'patients.cancel',
          name: 'Anular pacientes',
          description: null,
          module: 'patients',
          isActive: true,
        },
        effect: SecurityPermissionEffect.Deny,
      },
    ];

    administrationService.replaceUserPermissionOverrides.mockResolvedValue(
      result,
    );

    await expect(
      controller.replaceUserPermissionOverrides(
        7,
        body,
      ),
    ).resolves.toEqual(result);

    expect(
      administrationService.replaceUserPermissionOverrides,
    ).toHaveBeenCalledTimes(1);

    expect(
      administrationService.replaceUserPermissionOverrides,
    ).toHaveBeenCalledWith(
      7,
      body,
    );
  });

  it('delega una lista vacia de overrides sin modificar el cuerpo', async () => {
    const body = {
      overrides: [],
    };

    administrationService.replaceUserPermissionOverrides.mockResolvedValue(
      [],
    );

    await expect(
      controller.replaceUserPermissionOverrides(
        7,
        body,
      ),
    ).resolves.toEqual([]);

    expect(
      administrationService.replaceUserPermissionOverrides,
    ).toHaveBeenCalledWith(
      7,
      body,
    );
  });

  it('registra el reemplazo como PUT users por id y permission overrides', () => {
    const method =
      AuthorizationController.prototype.replaceUserPermissionOverrides;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('users/:id/permission-overrides');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.PUT);
  });
  it('delega el reemplazo de roles del usuario', async () => {
    const body = {
      roleIds: [1, 2],
    };

    const roles = [
      {
        id: 1,
        code: 'admin',
        name: 'Administrador',
        description: null,
        isSystem: true,
        isActive: true,
      },
      {
        id: 2,
        code: 'operator',
        name: 'Operador',
        description: null,
        isSystem: false,
        isActive: true,
      },
    ];

    administrationService.replaceUserRoles.mockResolvedValue(
      roles,
    );

    await expect(
      controller.replaceUserRoles(7, body),
    ).resolves.toEqual(roles);

    expect(
      administrationService.replaceUserRoles,
    ).toHaveBeenCalledTimes(1);

    expect(
      administrationService.replaceUserRoles,
    ).toHaveBeenCalledWith(
      7,
      body,
    );
  });

  it('delega una lista vacia de roles sin modificar el cuerpo', async () => {
    const body = {
      roleIds: [],
    };

    administrationService.replaceUserRoles.mockResolvedValue(
      [],
    );

    await expect(
      controller.replaceUserRoles(7, body),
    ).resolves.toEqual([]);

    expect(
      administrationService.replaceUserRoles,
    ).toHaveBeenCalledWith(
      7,
      body,
    );
  });

  it('registra el reemplazo como PUT users por id y roles', () => {
    const method =
      AuthorizationController.prototype.replaceUserRoles;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('users/:id/roles');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.PUT);
  });
  it('delega la consulta administrativa de un usuario', async () => {
    const result = {
      user: {
        id: 7,
        name: 'Usuario de prueba',
        user_name: 'test.user',
        roles: 'admin,annular',
        hide_user: false,
      },
      assignedRoles: [],
      inheritedPermissions: [],
      permissionOverrides: [],
      context: {
        userId: 7,
        roles: ['admin', 'annular'],
        permissions: ['security.users.read'],
        deniedPermissions: [],
      },
    };

    administrationService.getUserAuthorization.mockResolvedValue(
      result,
    );

    await expect(
      controller.getUserAuthorization(7),
    ).resolves.toEqual(result);

    expect(
      administrationService.getUserAuthorization,
    ).toHaveBeenCalledTimes(1);

    expect(
      administrationService.getUserAuthorization,
    ).toHaveBeenCalledWith(7);
  });

  it('conserva context null en la respuesta administrativa', async () => {
    const result = {
      user: {
        id: 7,
        name: 'Usuario oculto',
        user_name: 'hidden.user',
        roles: 'user',
        hide_user: true,
      },
      assignedRoles: [],
      inheritedPermissions: [],
      permissionOverrides: [],
      context: null,
    };

    administrationService.getUserAuthorization.mockResolvedValue(
      result,
    );

    await expect(
      controller.getUserAuthorization(7),
    ).resolves.toEqual(result);

    expect(result.context).toBeNull();
  });

  it('registra la consulta como GET authorization users por id', () => {
    const method =
      AuthorizationController.prototype.getUserAuthorization;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('users/:id');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.GET);
  });
  it('delega el catalogo de permisos', async () => {
    const permissions = [
      {
        id: 1,
        code: 'security.permissions.read',
        name: 'Consultar permisos',
        description: null,
        module: 'security',
        isActive: true,
      },
    ];

    administrationService.getPermissions.mockResolvedValue(
      permissions,
    );

    await expect(
      controller.getPermissions(),
    ).resolves.toEqual(permissions);

    expect(
      administrationService.getPermissions,
    ).toHaveBeenCalledTimes(1);
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

  it('delega el reemplazo de permisos del rol', async () => {
    const body = {
      permissionIds: [1, 2, 3],
    };

    const permissions = [
      {
        id: 1,
        code: 'security.permissions.read',
        name: 'Consultar permisos',
        description: null,
        module: 'security',
        isActive: true,
      },
    ];

    administrationService.replaceRolePermissions.mockResolvedValue(
      permissions,
    );

    await expect(
      controller.replaceRolePermissions(4, body),
    ).resolves.toEqual(permissions);

    expect(
      administrationService.replaceRolePermissions,
    ).toHaveBeenCalledTimes(1);

    expect(
      administrationService.replaceRolePermissions,
    ).toHaveBeenCalledWith(
      4,
      body,
    );
  });

  it('delega una lista vacia de permisos sin modificar el cuerpo', async () => {
    const body = {
      permissionIds: [],
    };

    administrationService.replaceRolePermissions.mockResolvedValue(
      [],
    );

    await expect(
      controller.replaceRolePermissions(4, body),
    ).resolves.toEqual([]);

    expect(
      administrationService.replaceRolePermissions,
    ).toHaveBeenCalledWith(
      4,
      body,
    );
  });

  it('registra el reemplazo como PUT roles por id y permissions', () => {
    const method =
      AuthorizationController.prototype.replaceRolePermissions;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('roles/:id/permissions');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.PUT);
  });
  it('delega la actualizacion de un rol', async () => {
    const body = {
      name: 'Supervisor operativo',
      description: 'Supervision general',
      isActive: false,
    };

    const updatedRole = {
      id: 4,
      code: 'supervisor',
      ...body,
      isSystem: false,
    };

    administrationService.updateRole.mockResolvedValue(
      updatedRole,
    );

    await expect(
      controller.updateRole(4, body),
    ).resolves.toEqual(updatedRole);

    expect(
      administrationService.updateRole,
    ).toHaveBeenCalledTimes(1);

    expect(
      administrationService.updateRole,
    ).toHaveBeenCalledWith(
      4,
      body,
    );
  });

  it('registra la actualizacion como PATCH roles por id', () => {
    const method =
      AuthorizationController.prototype.updateRole;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('roles/:id');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.PATCH);
  });
  it('registra el catalogo como GET permissions', () => {
    const method =
      AuthorizationController.prototype.getPermissions;

    expect(
      Reflect.getMetadata(PATH_METADATA, method),
    ).toBe('permissions');

    expect(
      Reflect.getMetadata(METHOD_METADATA, method),
    ).toBe(RequestMethod.GET);
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
    ['getPermissions', 'security.permissions.read'],
    ['getRoles', 'security.roles.read'],
    ['createRole', 'security.roles.create'],
    ['updateRole', 'security.roles.update'],
    ['replaceRolePermissions', 'security.roles.assign-permissions'],
    ['getUserAuthorization', 'security.users.read'],
    ['replaceUserRoles', 'security.users.assign-roles'],
    ['replaceUserPermissionOverrides', 'security.users.assign-permissions'],
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
