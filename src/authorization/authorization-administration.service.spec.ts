import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRole } from './entities/security-role.entity';
import { SecurityRolePermission } from './entities/security-role-permission.entity';
import { User } from '../users/users.entity';
import { SecurityUserRole } from './entities/security-user-role.entity';
import {
  SecurityPermissionEffect,
  SecurityUserPermissionOverride,
} from './entities/security-user-permission-override.entity';
import { AuthorizationService } from './authorization.service';

type RepositoryMockType = Partial<Record<keyof Repository<any>, jest.Mock>>;

describe('AuthorizationAdministrationService', () => {
  let service: AuthorizationAdministrationService;
  let rolesRepository: RepositoryMockType;
  let permissionsRepository: RepositoryMockType;
  let rolePermissionsRepository: RepositoryMockType;
  let userRepository: RepositoryMockType;
  let userRolesRepository: RepositoryMockType;
  let userPermissionOverridesRepository: RepositoryMockType;
  let authorizationServiceMock: Partial<AuthorizationService>;
  let dataSourceMock: { transaction: jest.Mock };

  beforeEach(() => {
    rolesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    permissionsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    rolePermissionsRepository = {
      find: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
    };

    userRolesRepository = {
      find: jest.fn(),
    };

    userPermissionOverridesRepository = {
      find: jest.fn(),
    };

    authorizationServiceMock = {
      resolveContext: jest.fn(),
    };

    dataSourceMock = {
      transaction: jest.fn(),
    };

    service = new AuthorizationAdministrationService(
      rolesRepository as any,
      permissionsRepository as any,
      rolePermissionsRepository as any,
      userRepository as any,
      userRolesRepository as any,
      userPermissionOverridesRepository as any,
      authorizationServiceMock as any,
      dataSourceMock as any,
    );
  });


  it('consulta permisos activos e inactivos ordenados', async () => {
    const permissions = [
      createPermission(1, 'security.permissions.read', 'security', true),
      createPermission(2, 'users.legacy', 'users', false),
    ];

    permissionsRepository.find.mockResolvedValue(
      permissions,
    );

    const result = await service.getPermissions();

    expect(result).toEqual(permissions);

    expect(
      permissionsRepository.find,
    ).toHaveBeenCalledWith({
      order: {
        module: 'ASC',
        code: 'ASC',
      },
    });
  });
  it('consulta los roles ordenados por codigo', async () => {
    rolesRepository.find.mockResolvedValue([
      createRole(1, 'admin', true),
      createRole(2, 'user', true),
    ]);

    const result = await service.getRoles();

    expect(result).toHaveLength(2);

    expect(rolesRepository.find).toHaveBeenCalledWith({
      order: {
        code: 'ASC',
      },
    });
  });

  it('actualiza los metadatos de un rol configurable', async () => {
    const role = createRole(4, 'supervisor', false);

    rolesRepository.findOne.mockResolvedValue(role);
    rolesRepository.save.mockResolvedValue({
      ...role,
      name: 'Supervisor operativo',
      description: 'Supervision general',
      isActive: false,
    });

    const result = await service.updateRole(4, {
      name: ' Supervisor operativo ',
      description: ' Supervision general ',
      isActive: false,
    });

    expect(rolesRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 4,
      },
    });

    expect(role).toMatchObject({
      code: 'supervisor',
      name: 'Supervisor operativo',
      description: 'Supervision general',
      isSystem: false,
      isActive: false,
    });

    expect(rolesRepository.save).toHaveBeenCalledWith(role);
    expect(result.isActive).toBe(false);
  });

  it('permite activar nuevamente un rol configurable', async () => {
    const role = createRole(4, 'supervisor', false);
    role.isActive = false;

    rolesRepository.findOne.mockResolvedValue(role);
    rolesRepository.save.mockImplementation(
      async (value) => value,
    );

    await expect(
      service.updateRole(4, {
        isActive: true,
      }),
    ).resolves.toMatchObject({
      id: 4,
      isActive: true,
    });
  });

  it('normaliza una descripcion vacia como null', async () => {
    const role = createRole(4, 'supervisor', false);
    role.description = 'Descripcion anterior';

    rolesRepository.findOne.mockResolvedValue(role);
    rolesRepository.save.mockImplementation(
      async (value) => value,
    );

    const result = await service.updateRole(4, {
      description: '   ',
    });

    expect(result.description).toBeNull();
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
  ])(
    'rechaza el identificador de rol invalido %s',
    async (roleId) => {
      await expect(
        service.updateRole(roleId, {
          name: 'Supervisor',
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'ROLE_ID_INVALID',
        },
      });

      expect(rolesRepository.findOne).not.toHaveBeenCalled();
    },
  );

  it('rechaza un rol inexistente', async () => {
    rolesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateRole(999, {
        name: 'Supervisor',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_NOT_FOUND',
      },
    });

    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it('interpreta name undefined como ausencia de cambio', async () => {
    await expect(
      service.updateRole(4, {
        name: undefined,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_UPDATE_REQUIRED',
      },
    });

    expect(rolesRepository.findOne).not.toHaveBeenCalled();
  });
  it('rechaza un cuerpo sin cambios validos', async () => {
    await expect(
      service.updateRole(4, {}),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_UPDATE_REQUIRED',
      },
    });

    expect(rolesRepository.findOne).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '   ',
  ])(
    'rechaza el nombre actualizado invalido %s',
    async (name) => {
      const role = createRole(4, 'supervisor', false);

      rolesRepository.findOne.mockResolvedValue(role);

      await expect(
        service.updateRole(4, {
          name: name as string,
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'ROLE_NAME_REQUIRED',
        },
      });

      expect(rolesRepository.save).not.toHaveBeenCalled();
    },
  );

  it('rechaza un nombre actualizado demasiado largo', async () => {
    const role = createRole(4, 'supervisor', false);

    rolesRepository.findOne.mockResolvedValue(role);

    await expect(
      service.updateRole(4, {
        name: 'N'.repeat(101),
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_NAME_TOO_LONG',
      },
    });

    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza una descripcion actualizada demasiado larga', async () => {
    const role = createRole(4, 'supervisor', false);

    rolesRepository.findOne.mockResolvedValue(role);

    await expect(
      service.updateRole(4, {
        description: 'D'.repeat(251),
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_DESCRIPTION_TOO_LONG',
      },
    });

    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza un estado activo que no sea booleano', async () => {
    const role = createRole(4, 'supervisor', false);

    rolesRepository.findOne.mockResolvedValue(role);

    await expect(
      service.updateRole(4, {
        isActive: 'false' as unknown as boolean,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_ACTIVE_STATE_INVALID',
      },
    });

    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it('impide desactivar el rol admin', async () => {
    const role = createRole(1, 'admin', true);

    rolesRepository.findOne.mockResolvedValue(role);

    await expect(
      service.updateRole(1, {
        isActive: false,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ADMIN_ROLE_MUST_REMAIN_ACTIVE',
      },
    });

    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it('permite actualizar el nombre del rol admin sin alterar su codigo', async () => {
    const role = createRole(1, 'admin', true);

    rolesRepository.findOne.mockResolvedValue(role);
    rolesRepository.save.mockImplementation(
      async (value) => value,
    );

    const result = await service.updateRole(1, {
      name: 'Administrador principal',
    });

    expect(result).toMatchObject({
      code: 'admin',
      name: 'Administrador principal',
      isSystem: true,
      isActive: true,
    });
  });

  it('rechaza modificar el codigo aunque llegue fuera del DTO', async () => {
    await expect(
      service.updateRole(4, {
        code: 'other-code',
        name: 'Otro nombre',
      } as unknown as {
        name?: string;
        description?: string | null;
        isActive?: boolean;
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_CODE_IMMUTABLE',
      },
    });

    expect(rolesRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza modificar la condicion de rol de sistema', async () => {
    await expect(
      service.updateRole(4, {
        isSystem: true,
        name: 'Supervisor',
      } as unknown as {
        name?: string;
        description?: string | null;
        isActive?: boolean;
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_SYSTEM_FLAG_IMMUTABLE',
      },
    });

    expect(rolesRepository.findOne).not.toHaveBeenCalled();
  });
  it('normaliza y crea un rol configurable activo', async () => {
    const createdRole = createRole(
      0,
      'supervisor',
      false,
    );

    createdRole.name = 'Supervisor';
    createdRole.description = 'Supervision operativa';

    const savedRole = {
      ...createdRole,
      id: 4,
    };

    rolesRepository.findOne.mockResolvedValue(null);
    rolesRepository.create.mockReturnValue(createdRole);
    rolesRepository.save.mockResolvedValue(savedRole);

    const result = await service.createRole({
      code: ' Supervisor ',
      name: ' Supervisor ',
      description: ' Supervision operativa ',
    });

    expect(rolesRepository.findOne).toHaveBeenCalledWith({
      where: {
        code: 'supervisor',
      },
      select: {
        id: true,
      },
    });

    expect(rolesRepository.create).toHaveBeenCalledWith({
      code: 'supervisor',
      name: 'Supervisor',
      description: 'Supervision operativa',
      isSystem: false,
      isActive: true,
    });

    expect(result).toEqual(savedRole);
  });

  it('normaliza una descripcion vacia como null', async () => {
    const role = createRole(0, 'cashier', false);

    rolesRepository.findOne.mockResolvedValue(null);
    rolesRepository.create.mockReturnValue(role);
    rolesRepository.save.mockResolvedValue({
      ...role,
      id: 5,
    });

    await service.createRole({
      code: 'cashier',
      name: 'Cajero',
      description: '   ',
    });

    expect(rolesRepository.create).toHaveBeenCalledWith({
      code: 'cashier',
      name: 'Cajero',
      description: null,
      isSystem: false,
      isActive: true,
    });
  });

  it('rechaza un codigo duplicado', async () => {
    rolesRepository.findOne.mockResolvedValue({
      id: 1,
    } as SecurityRole);

    await expect(
      service.createRole({
        code: 'ADMIN',
        name: 'Administrador alternativo',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(rolesRepository.create).not.toHaveBeenCalled();
    expect(rolesRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    ['', 'ROLE_CODE_REQUIRED'],
    ['   ', 'ROLE_CODE_REQUIRED'],
    ['1admin', 'ROLE_CODE_INVALID'],
    ['admin role', 'ROLE_CODE_INVALID'],
    ['admin/role', 'ROLE_CODE_INVALID'],
    ['área', 'ROLE_CODE_INVALID'],
  ])(
    'rechaza el codigo invalido %s',
    async (code, expectedMessage) => {
      await expect(
        service.createRole({
          code,
          name: 'Rol de prueba',
        }),
      ).rejects.toMatchObject({
        response: {
          message: expectedMessage,
        },
      });

      expect(rolesRepository.findOne).not.toHaveBeenCalled();
    },
  );

  it('rechaza un codigo mayor de sesenta caracteres', async () => {
    await expect(
      service.createRole({
        code: `r${'a'.repeat(60)}`,
        name: 'Rol de prueba',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_CODE_TOO_LONG',
      },
    });
  });

  it.each([
    undefined,
    '',
    '   ',
  ])(
    'rechaza el nombre requerido %s',
    async (name) => {
      await expect(
        service.createRole({
          code: 'test-role',
          name: name as string,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(rolesRepository.findOne).not.toHaveBeenCalled();
    },
  );

  it('rechaza un nombre mayor de cien caracteres', async () => {
    await expect(
      service.createRole({
        code: 'test-role',
        name: 'N'.repeat(101),
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_NAME_TOO_LONG',
      },
    });
  });

  it('rechaza una descripcion mayor de doscientos cincuenta caracteres', async () => {
    await expect(
      service.createRole({
        code: 'test-role',
        name: 'Rol de prueba',
        description: 'D'.repeat(251),
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'ROLE_DESCRIPTION_TOO_LONG',
      },
    });
  });

  it('nunca permite crear un rol de sistema desde el DTO', async () => {
    const role = createRole(0, 'operator', false);

    rolesRepository.findOne.mockResolvedValue(null);
    rolesRepository.create.mockReturnValue(role);
    rolesRepository.save.mockResolvedValue({
      ...role,
      id: 6,
    });

    await service.createRole({
      code: 'operator',
      name: 'Operador',
    });

    expect(rolesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isSystem: false,
        isActive: true,
      }),
    );
  });

  describe('getUserAuthorization', () => {
    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
    ])(
      'rechaza el identificador de usuario invalido %s',
      async (userId) => {
        await expect(
          service.getUserAuthorization(userId),
        ).rejects.toMatchObject({
          response: {
            message: 'USER_ID_INVALID',
          },
        });

        expect(userRepository.findOne).not.toHaveBeenCalled();
      },
    );

    it('rechaza un usuario inexistente', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserAuthorization(999),
      ).rejects.toMatchObject({
        response: {
          message: 'USER_NOT_FOUND',
        },
      });

      expect(userRolesRepository.find).not.toHaveBeenCalled();
    });

    it('devuelve una vista segura, ordenada y completa', async () => {
      const user = createUser();
      const activeRole = createRole(2, 'operator', false);
      const inactiveRole = createRole(3, 'auditor', false);
      inactiveRole.isActive = false;

      const inheritedPermissionA = createPermission(
        10,
        'patients.read',
        'patients',
        true,
      );

      const inheritedPermissionB = createPermission(
        11,
        'reports.read',
        'reports',
        true,
      );

      const allowedPermission = createPermission(
        12,
        'security.users.read',
        'security',
        true,
      );

      const deniedPermission = createPermission(
        13,
        'patients.cancel',
        'patients',
        false,
      );

      const context = {
        userId: 7,
        roles: ['operator'],
        permissions: [
          'patients.read',
          'reports.read',
          'security.users.read',
        ],
        deniedPermissions: ['patients.cancel'],
      };

      userRepository.findOne.mockResolvedValue(user);

      userRolesRepository.find.mockResolvedValue([
        {
          userId: 7,
          roleId: 2,
        },
        {
          userId: 7,
          roleId: 3,
        },
        {
          userId: 7,
          roleId: 2,
        },
        {
          userId: 7,
          roleId: 0,
        },
        {
          userId: 7,
          roleId: 1.5,
        },
      ]);

      rolesRepository.find.mockResolvedValue([
        activeRole,
        inactiveRole,
      ]);

      rolePermissionsRepository.find.mockResolvedValue([
        {
          roleId: 2,
          permissionId: 11,
        },
        {
          roleId: 2,
          permissionId: 10,
        },
        {
          roleId: 2,
          permissionId: 10,
        },
        {
          roleId: 2,
          permissionId: 0,
        },
        {
          roleId: 2,
          permissionId: 1.5,
        },
      ]);

      permissionsRepository.find
        .mockResolvedValueOnce([
          inheritedPermissionB,
          inheritedPermissionA,
        ])
        .mockResolvedValueOnce([
          deniedPermission,
          allowedPermission,
        ]);

      userPermissionOverridesRepository.find.mockResolvedValue([
        {
          userId: 7,
          permissionId: 12,
          effect: SecurityPermissionEffect.Allow,
        },
        {
          userId: 7,
          permissionId: 13,
          effect: SecurityPermissionEffect.Deny,
        },
        {
          userId: 7,
          permissionId: 999,
          effect: SecurityPermissionEffect.Allow,
        },
        {
          userId: 7,
          permissionId: 0,
          effect: SecurityPermissionEffect.Allow,
        },
      ]);

      authorizationServiceMock.resolveContext =
        jest.fn().mockResolvedValue(context);

      const result = await service.getUserAuthorization(7);

      expect(result.user).toMatchObject({
        id: 7,
        user_name: 'test.user',
        roles: 'admin,annular',
      });

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty(
        'passwordSignature',
      );
      expect(result.user).not.toHaveProperty('key_signing');
      expect(result.user).not.toHaveProperty('key_recover');
      expect(result.user).not.toHaveProperty(
        'request_password',
      );

      expect(
        result.assignedRoles.map((role) => role.code),
      ).toEqual([
        'auditor',
        'operator',
      ]);

      expect(
        result.inheritedPermissions.map(
          (permission) =>
            `${permission.module}.${permission.code}`,
        ),
      ).toEqual([
        'patients.patients.read',
        'reports.reports.read',
      ]);

      expect(
        result.permissionOverrides.map((override) => ({
          code: override.permission.code,
          effect: override.effect,
          active: override.permission.isActive,
        })),
      ).toEqual([
        {
          code: 'patients.cancel',
          effect: SecurityPermissionEffect.Deny,
          active: false,
        },
        {
          code: 'security.users.read',
          effect: SecurityPermissionEffect.Allow,
          active: true,
        },
      ]);

      expect(result.context).toEqual(context);

      expect(
        authorizationServiceMock.resolveContext,
      ).toHaveBeenCalledWith(7);

      expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it('consulta permisos heredados solo desde roles activos', async () => {
      const user = createUser();
      const activeRole = createRole(2, 'operator', false);
      const inactiveRole = createRole(3, 'auditor', false);
      inactiveRole.isActive = false;

      userRepository.findOne.mockResolvedValue(user);

      userRolesRepository.find.mockResolvedValue([
        {
          userId: 7,
          roleId: 2,
        },
        {
          userId: 7,
          roleId: 3,
        },
      ]);

      rolesRepository.find.mockResolvedValue([
        inactiveRole,
        activeRole,
      ]);

      rolePermissionsRepository.find.mockResolvedValue([]);
      userPermissionOverridesRepository.find.mockResolvedValue([]);

      authorizationServiceMock.resolveContext =
        jest.fn().mockResolvedValue({
          userId: 7,
          roles: ['operator'],
          permissions: [],
          deniedPermissions: [],
        });

      await service.getUserAuthorization(7);

      expect(
        rolePermissionsRepository.find,
      ).toHaveBeenCalledTimes(1);

      expect(
        rolePermissionsRepository.find,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roleId: expect.objectContaining({
              value: [2],
            }),
          }),
        }),
      );
    });

    it('conserva context null para un usuario oculto', async () => {
      const user = createUser();
      user.hide_user = true;

      userRepository.findOne.mockResolvedValue(user);
      userRolesRepository.find.mockResolvedValue([]);
      userPermissionOverridesRepository.find.mockResolvedValue([]);

      authorizationServiceMock.resolveContext =
        jest.fn().mockResolvedValue(null);

      const result = await service.getUserAuthorization(7);

      expect(result.user.hide_user).toBe(true);
      expect(result.assignedRoles).toEqual([]);
      expect(result.inheritedPermissions).toEqual([]);
      expect(result.permissionOverrides).toEqual([]);
      expect(result.context).toBeNull();

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 7,
        },
      });
    });

    it('es una operacion exclusivamente de lectura', async () => {
      const user = createUser();

      userRepository.findOne.mockResolvedValue(user);
      userRolesRepository.find.mockResolvedValue([]);
      userPermissionOverridesRepository.find.mockResolvedValue([]);

      authorizationServiceMock.resolveContext =
        jest.fn().mockResolvedValue(null);

      await service.getUserAuthorization(7);

      expect(dataSourceMock.transaction).not.toHaveBeenCalled();
      expect(rolesRepository.save).not.toHaveBeenCalled();
      expect(permissionsRepository.save).toBeUndefined();
    });
  });
  describe('replaceUserPermissionOverrides', () => {
    let transactionalUserRepository: {
      findOne: jest.Mock;
    };

    let transactionalPermissionsRepository: {
      find: jest.Mock;
    };

    let transactionalOverridesRepository: {
      delete: jest.Mock;
      save: jest.Mock;
    };

    let transactionalManager: {
      getRepository: jest.Mock;
    };

    beforeEach(() => {
      transactionalUserRepository = {
        findOne: jest.fn(),
      };

      transactionalPermissionsRepository = {
        find: jest.fn(),
      };

      transactionalOverridesRepository = {
        delete: jest.fn(),
        save: jest.fn(),
      };

      transactionalManager = {
        getRepository: jest.fn((entity) => {
          if (entity === User) {
            return transactionalUserRepository;
          }

          if (entity === SecurityPermission) {
            return transactionalPermissionsRepository;
          }

          if (entity === SecurityUserPermissionOverride) {
            return transactionalOverridesRepository;
          }

          throw new Error('UNKNOWN_TRANSACTIONAL_ENTITY');
        }),
      };

      dataSourceMock.transaction.mockImplementation(
        async (callback) => callback(transactionalManager),
      );
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
    ])(
      'rechaza el identificador de usuario invalido %s',
      async (userId) => {
        await expect(
          service.replaceUserPermissionOverrides(userId, {
            overrides: [],
          }),
        ).rejects.toMatchObject({
          response: {
            message: 'USER_ID_INVALID',
          },
        });

        expect(
          dataSourceMock.transaction,
        ).not.toHaveBeenCalled();
      },
    );

    it('rechaza un DTO ausente', async () => {
      await expect(
        service.replaceUserPermissionOverrides(
          7,
          undefined as unknown as {
            overrides: [];
          },
        ),
      ).rejects.toMatchObject({
        response: {
          message: 'PERMISSION_OVERRIDES_REQUIRED',
        },
      });

      expect(
        dataSourceMock.transaction,
      ).not.toHaveBeenCalled();
    });

    it('rechaza overrides cuando no es un arreglo', async () => {
      await expect(
        service.replaceUserPermissionOverrides(7, {
          overrides: 'invalid',
        } as unknown as {
          overrides: [];
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'PERMISSION_OVERRIDES_REQUIRED',
        },
      });

      expect(
        dataSourceMock.transaction,
      ).not.toHaveBeenCalled();
    });

    it('rechaza un elemento de override invalido', async () => {
      await expect(
        service.replaceUserPermissionOverrides(7, {
          overrides: [
            null,
          ],
        } as unknown as {
          overrides: [];
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'PERMISSION_OVERRIDE_INVALID',
        },
      });

      expect(
        dataSourceMock.transaction,
      ).not.toHaveBeenCalled();
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
    ])(
      'rechaza el identificador de permiso invalido %s',
      async (permissionId) => {
        await expect(
          service.replaceUserPermissionOverrides(7, {
            overrides: [
              {
                permissionId,
                effect: SecurityPermissionEffect.Allow,
              },
            ],
          }),
        ).rejects.toMatchObject({
          response: {
            message: 'PERMISSION_ID_INVALID',
          },
        });

        expect(
          dataSourceMock.transaction,
        ).not.toHaveBeenCalled();
      },
    );

    it('rechaza un effect no soportado', async () => {
      await expect(
        service.replaceUserPermissionOverrides(7, {
          overrides: [
            {
              permissionId: 10,
              effect: 'grant',
            },
          ],
        } as unknown as {
          overrides: Array<{
            permissionId: number;
            effect: SecurityPermissionEffect;
          }>;
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'PERMISSION_EFFECT_INVALID',
        },
      });

      expect(
        dataSourceMock.transaction,
      ).not.toHaveBeenCalled();
    });

    it('rechaza permissionId duplicado aunque cambie el effect', async () => {
      await expect(
        service.replaceUserPermissionOverrides(7, {
          overrides: [
            {
              permissionId: 10,
              effect: SecurityPermissionEffect.Allow,
            },
            {
              permissionId: 10,
              effect: SecurityPermissionEffect.Deny,
            },
          ],
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'PERMISSION_OVERRIDE_DUPLICATED',
        },
      });

      expect(
        dataSourceMock.transaction,
      ).not.toHaveBeenCalled();
    });

    it('rechaza un usuario inexistente', async () => {
      transactionalUserRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.replaceUserPermissionOverrides(999, {
          overrides: [],
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'USER_NOT_FOUND',
        },
      });

      expect(
        transactionalPermissionsRepository.find,
      ).not.toHaveBeenCalled();

      expect(
        transactionalOverridesRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it('rechaza permisos inexistentes o inactivos', async () => {
      const user = createUser();

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalPermissionsRepository.find.mockResolvedValue(
        [],
      );

      await expect(
        service.replaceUserPermissionOverrides(7, {
          overrides: [
            {
              permissionId: 10,
              effect: SecurityPermissionEffect.Allow,
            },
          ],
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'PERMISSIONS_NOT_FOUND_OR_INACTIVE',
        },
      });

      expect(
        transactionalOverridesRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it('permite eliminar todos los overrides del usuario', async () => {
      const user = createUser();

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalOverridesRepository.delete.mockResolvedValue(
        {},
      );

      const result =
        await service.replaceUserPermissionOverrides(7, {
          overrides: [],
        });

      expect(result).toEqual([]);

      expect(
        transactionalPermissionsRepository.find,
      ).not.toHaveBeenCalled();

      expect(
        transactionalOverridesRepository.delete,
      ).toHaveBeenCalledWith({
        userId: 7,
      });

      expect(
        transactionalOverridesRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('reemplaza overrides atomicamente y devuelve una vista ordenada', async () => {
      const user = createUser();

      const permissionA = createPermission(
        10,
        'patients.cancel',
        'patients',
        true,
      );

      const permissionB = createPermission(
        11,
        'security.users.read',
        'security',
        true,
      );

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalPermissionsRepository.find.mockResolvedValue([
        permissionB,
        permissionA,
      ]);

      const callOrder: string[] = [];

      transactionalOverridesRepository.delete.mockImplementation(
        async () => {
          callOrder.push('delete');
        },
      );

      transactionalOverridesRepository.save.mockImplementation(
        async () => {
          callOrder.push('save');
        },
      );

      const result =
        await service.replaceUserPermissionOverrides(7, {
          overrides: [
            {
              permissionId: 11,
              effect: SecurityPermissionEffect.Allow,
            },
            {
              permissionId: 10,
              effect: SecurityPermissionEffect.Deny,
            },
          ],
        });

      expect(
        dataSourceMock.transaction,
      ).toHaveBeenCalledTimes(1);

      expect(callOrder).toEqual([
        'delete',
        'save',
      ]);

      expect(
        transactionalPermissionsRepository.find,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              value: [
                11,
                10,
              ],
            }),
            isActive: true,
          }),
        }),
      );

      expect(
        transactionalOverridesRepository.save,
      ).toHaveBeenCalledWith([
        {
          userId: 7,
          permissionId: 11,
          effect: SecurityPermissionEffect.Allow,
        },
        {
          userId: 7,
          permissionId: 10,
          effect: SecurityPermissionEffect.Deny,
        },
      ]);

      expect(
        result.map((override) => ({
          code: override.permission.code,
          effect: override.effect,
        })),
      ).toEqual([
        {
          code: 'patients.cancel',
          effect: SecurityPermissionEffect.Deny,
        },
        {
          code: 'security.users.read',
          effect: SecurityPermissionEffect.Allow,
        },
      ]);
    });

    it('no ejecuta save cuando delete falla', async () => {
      const user = createUser();

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalOverridesRepository.delete.mockRejectedValue(
        new Error('DELETE_OVERRIDE_FAILED'),
      );

      await expect(
        service.replaceUserPermissionOverrides(7, {
          overrides: [],
        }),
      ).rejects.toThrow('DELETE_OVERRIDE_FAILED');

      expect(
        transactionalOverridesRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('rechaza la transaccion cuando save falla', async () => {
      const user = createUser();
      const permission = createPermission(
        10,
        'patients.cancel',
        'patients',
        true,
      );

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalPermissionsRepository.find.mockResolvedValue([
        permission,
      ]);

      transactionalOverridesRepository.delete.mockResolvedValue(
        {},
      );

      transactionalOverridesRepository.save.mockRejectedValue(
        new Error('SAVE_OVERRIDE_FAILED'),
      );

      await expect(
        service.replaceUserPermissionOverrides(7, {
          overrides: [
            {
              permissionId: 10,
              effect: SecurityPermissionEffect.Deny,
            },
          ],
        }),
      ).rejects.toThrow('SAVE_OVERRIDE_FAILED');
    });

    it('usa repositorios transaccionales sin modificar roles ni users roles', async () => {
      const user = createUser();
      const legacyRoles = user.roles;

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalOverridesRepository.delete.mockResolvedValue(
        {},
      );

      await service.replaceUserPermissionOverrides(7, {
        overrides: [],
      });

      expect(userRepository.findOne).not.toHaveBeenCalled();

      expect(
        permissionsRepository.find,
      ).not.toHaveBeenCalled();

      expect(
        userPermissionOverridesRepository.find,
      ).not.toHaveBeenCalled();

      expect(
        userRolesRepository.find,
      ).not.toHaveBeenCalled();

      expect(
        rolePermissionsRepository.find,
      ).not.toHaveBeenCalled();

      expect(rolesRepository.find).not.toHaveBeenCalled();
      expect(user.roles).toBe(legacyRoles);
    });
  });
  describe('replaceUserRoles', () => {
    let transactionalUserRepository: {
      findOne: jest.Mock;
      count: jest.Mock;
    };

    let transactionalRolesRepository: {
      find: jest.Mock;
      findOne: jest.Mock;
    };

    let transactionalUserRolesRepository: {
      find: jest.Mock;
      delete: jest.Mock;
      save: jest.Mock;
    };

    let transactionalManager: {
      getRepository: jest.Mock;
    };

    beforeEach(() => {
      transactionalUserRepository = {
        findOne: jest.fn(),
        count: jest.fn(),
      };

      transactionalRolesRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
      };

      transactionalUserRolesRepository = {
        find: jest.fn(),
        delete: jest.fn(),
        save: jest.fn(),
      };

      transactionalManager = {
        getRepository: jest.fn((entity) => {
          if (entity === User) {
            return transactionalUserRepository;
          }

          if (entity === SecurityRole) {
            return transactionalRolesRepository;
          }

          if (entity === SecurityUserRole) {
            return transactionalUserRolesRepository;
          }

          throw new Error('UNKNOWN_TRANSACTIONAL_ENTITY');
        }),
      };

      dataSourceMock.transaction.mockImplementation(
        async (callback) => callback(transactionalManager),
      );
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
    ])(
      'rechaza el identificador de usuario invalido %s',
      async (userId) => {
        await expect(
          service.replaceUserRoles(userId, {
            roleIds: [],
          }),
        ).rejects.toMatchObject({
          response: {
            message: 'USER_ID_INVALID',
          },
        });

        expect(
          dataSourceMock.transaction,
        ).not.toHaveBeenCalled();
      },
    );

    it('rechaza un DTO ausente', async () => {
      await expect(
        service.replaceUserRoles(
          7,
          undefined as unknown as {
            roleIds: number[];
          },
        ),
      ).rejects.toMatchObject({
        response: {
          message: 'ROLE_IDS_REQUIRED',
        },
      });

      expect(
        dataSourceMock.transaction,
      ).not.toHaveBeenCalled();
    });

    it('rechaza roleIds cuando no es un arreglo', async () => {
      await expect(
        service.replaceUserRoles(7, {
          roleIds: 'admin',
        } as unknown as {
          roleIds: number[];
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'ROLE_IDS_REQUIRED',
        },
      });

      expect(
        dataSourceMock.transaction,
      ).not.toHaveBeenCalled();
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
    ])(
      'rechaza el identificador de rol invalido %s',
      async (roleId) => {
        await expect(
          service.replaceUserRoles(7, {
            roleIds: [roleId],
          }),
        ).rejects.toMatchObject({
          response: {
            message: 'ROLE_ID_INVALID',
          },
        });

        expect(
          dataSourceMock.transaction,
        ).not.toHaveBeenCalled();
      },
    );

    it('rechaza un usuario inexistente', async () => {
      transactionalUserRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.replaceUserRoles(999, {
          roleIds: [],
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'USER_NOT_FOUND',
        },
      });

      expect(
        transactionalRolesRepository.find,
      ).not.toHaveBeenCalled();

      expect(
        transactionalUserRolesRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it('elimina identificadores de rol duplicados', async () => {
      const user = createUser();
      const role = createRole(2, 'operator', false);

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.find.mockResolvedValue([
        role,
      ]);

      transactionalRolesRepository.findOne.mockResolvedValue(
        null,
      );

      transactionalUserRolesRepository.find.mockResolvedValue(
        [],
      );

      transactionalUserRolesRepository.delete.mockResolvedValue(
        {},
      );

      transactionalUserRolesRepository.save.mockResolvedValue(
        [],
      );

      await service.replaceUserRoles(7, {
        roleIds: [2, 2, 2],
      });

      expect(
        transactionalRolesRepository.find,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              value: [2],
            }),
            isActive: true,
          }),
        }),
      );

      expect(
        transactionalUserRolesRepository.save,
      ).toHaveBeenCalledWith([
        {
          userId: 7,
          roleId: 2,
        },
      ]);
    });

    it('rechaza roles inexistentes o inactivos', async () => {
      const user = createUser();

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.find.mockResolvedValue(
        [],
      );

      await expect(
        service.replaceUserRoles(7, {
          roleIds: [99],
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'ROLES_NOT_FOUND_OR_INACTIVE',
        },
      });

      expect(
        transactionalUserRolesRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it('permite a un usuario no administrador quedar sin roles', async () => {
      const user = createUser();

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.findOne.mockResolvedValue(
        createRole(1, 'admin', true),
      );

      transactionalUserRolesRepository.find.mockResolvedValue(
        [],
      );

      transactionalUserRolesRepository.delete.mockResolvedValue(
        {},
      );

      const result = await service.replaceUserRoles(7, {
        roleIds: [],
      });

      expect(result).toEqual([]);

      expect(
        transactionalUserRolesRepository.delete,
      ).toHaveBeenCalledWith({
        userId: 7,
      });

      expect(
        transactionalUserRolesRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('reemplaza roles en una transaccion y los ordena', async () => {
      const user = createUser();
      const auditorRole = createRole(3, 'auditor', false);
      const operatorRole = createRole(2, 'operator', false);

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.find.mockResolvedValue([
        operatorRole,
        auditorRole,
      ]);

      transactionalRolesRepository.findOne.mockResolvedValue(
        null,
      );

      transactionalUserRolesRepository.find.mockResolvedValue(
        [],
      );

      const callOrder: string[] = [];

      transactionalUserRolesRepository.delete.mockImplementation(
        async () => {
          callOrder.push('delete');
        },
      );

      transactionalUserRolesRepository.save.mockImplementation(
        async () => {
          callOrder.push('save');
        },
      );

      const result = await service.replaceUserRoles(7, {
        roleIds: [2, 3],
      });

      expect(
        dataSourceMock.transaction,
      ).toHaveBeenCalledTimes(1);

      expect(callOrder).toEqual([
        'delete',
        'save',
      ]);

      expect(
        result.map((role) => role.code),
      ).toEqual([
        'auditor',
        'operator',
      ]);
    });

    it('permite conservar admin en el usuario actual', async () => {
      const user = createUser();
      const adminRole = createRole(1, 'admin', true);

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.find.mockResolvedValue([
        adminRole,
      ]);

      transactionalRolesRepository.findOne.mockResolvedValue(
        adminRole,
      );

      transactionalUserRolesRepository.find.mockResolvedValue([
        {
          userId: 7,
          roleId: 1,
        },
      ]);

      transactionalUserRolesRepository.delete.mockResolvedValue(
        {},
      );

      transactionalUserRolesRepository.save.mockResolvedValue(
        [],
      );

      await expect(
        service.replaceUserRoles(7, {
          roleIds: [1],
        }),
      ).resolves.toEqual([
        adminRole,
      ]);

      expect(
        transactionalUserRepository.count,
      ).not.toHaveBeenCalled();
    });

    it('permite retirar admin si existe otro administrador visible', async () => {
      const user = createUser();
      const adminRole = createRole(1, 'admin', true);
      const operatorRole = createRole(2, 'operator', false);

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.find.mockResolvedValue([
        operatorRole,
      ]);

      transactionalRolesRepository.findOne.mockResolvedValue(
        adminRole,
      );

      transactionalUserRolesRepository.find
        .mockResolvedValueOnce([
          {
            userId: 7,
            roleId: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            userId: 8,
            roleId: 1,
          },
        ]);

      transactionalUserRepository.count.mockResolvedValue(1);

      transactionalUserRolesRepository.delete.mockResolvedValue(
        {},
      );

      transactionalUserRolesRepository.save.mockResolvedValue(
        [],
      );

      await expect(
        service.replaceUserRoles(7, {
          roleIds: [2],
        }),
      ).resolves.toEqual([
        operatorRole,
      ]);

      expect(
        transactionalUserRepository.count,
      ).toHaveBeenCalledTimes(1);
    });

    it('impide retirar admin si no existe otro administrador', async () => {
      const user = createUser();
      const adminRole = createRole(1, 'admin', true);

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.findOne.mockResolvedValue(
        adminRole,
      );

      transactionalUserRolesRepository.find
        .mockResolvedValueOnce([
          {
            userId: 7,
            roleId: 1,
          },
        ])
        .mockResolvedValueOnce([]);

      await expect(
        service.replaceUserRoles(7, {
          roleIds: [],
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'LAST_ADMIN_ROLE_REQUIRED',
        },
      });

      expect(
        transactionalUserRolesRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it('excluye administradores ocultos y normaliza identificadores', async () => {
      const user = createUser();
      const adminRole = createRole(1, 'admin', true);

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.findOne.mockResolvedValue(
        adminRole,
      );

      transactionalUserRolesRepository.find
        .mockResolvedValueOnce([
          {
            userId: 7,
            roleId: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            userId: 8,
            roleId: 1,
          },
          {
            userId: 8,
            roleId: 1,
          },
          {
            userId: 0,
            roleId: 1,
          },
          {
            userId: -1,
            roleId: 1,
          },
          {
            userId: 1.5,
            roleId: 1,
          },
        ]);

      transactionalUserRepository.count.mockResolvedValue(0);

      await expect(
        service.replaceUserRoles(7, {
          roleIds: [],
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'LAST_ADMIN_ROLE_REQUIRED',
        },
      });

      expect(
        transactionalUserRepository.count,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({
              value: [8],
            }),
            hide_user: false,
          }),
        }),
      );

      expect(
        transactionalUserRolesRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it('no ejecuta save cuando delete falla', async () => {
      const user = createUser();

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.findOne.mockResolvedValue(
        null,
      );

      transactionalUserRolesRepository.find.mockResolvedValue(
        [],
      );

      transactionalUserRolesRepository.delete.mockRejectedValue(
        new Error('DELETE_FAILED'),
      );

      await expect(
        service.replaceUserRoles(7, {
          roleIds: [],
        }),
      ).rejects.toThrow('DELETE_FAILED');

      expect(
        transactionalUserRolesRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('rechaza la transaccion cuando save falla', async () => {
      const user = createUser();
      const role = createRole(2, 'operator', false);

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.find.mockResolvedValue([
        role,
      ]);

      transactionalRolesRepository.findOne.mockResolvedValue(
        null,
      );

      transactionalUserRolesRepository.find.mockResolvedValue(
        [],
      );

      transactionalUserRolesRepository.delete.mockResolvedValue(
        {},
      );

      transactionalUserRolesRepository.save.mockRejectedValue(
        new Error('SAVE_FAILED'),
      );

      await expect(
        service.replaceUserRoles(7, {
          roleIds: [2],
        }),
      ).rejects.toThrow('SAVE_FAILED');
    });

    it('usa repositorios transaccionales y preserva users roles', async () => {
      const user = createUser();
      const legacyRoles = user.roles;

      transactionalUserRepository.findOne.mockResolvedValue(
        user,
      );

      transactionalRolesRepository.findOne.mockResolvedValue(
        null,
      );

      transactionalUserRolesRepository.find.mockResolvedValue(
        [],
      );

      transactionalUserRolesRepository.delete.mockResolvedValue(
        {},
      );

      await service.replaceUserRoles(7, {
        roleIds: [],
      });

      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(rolesRepository.find).not.toHaveBeenCalled();
      expect(userRolesRepository.find).not.toHaveBeenCalled();

      expect(
        userPermissionOverridesRepository.find,
      ).not.toHaveBeenCalled();

      expect(
        rolePermissionsRepository.find,
      ).not.toHaveBeenCalled();

      expect(user.roles).toBe(legacyRoles);
    });
  });
  describe('replaceRolePermissions', () => {
    let transactionalRolesRepository: RepositoryMock;
    let transactionalPermissionsRepository: RepositoryMock;
    let transactionalRolePermissionsRepository: RepositoryMock & { delete: jest.Mock };
    let entityManagerMock: any;

    beforeEach(() => {
      transactionalRolesRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      transactionalPermissionsRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      transactionalRolePermissionsRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
      };

      entityManagerMock = {
        getRepository: jest.fn((entity) => {
          if (entity === SecurityRole) return transactionalRolesRepository;
          if (entity === SecurityPermission) return transactionalPermissionsRepository;
          if (entity === SecurityRolePermission) return transactionalRolePermissionsRepository;
          throw new Error('Unknown entity');
        }),
      };

      dataSourceMock.transaction.mockImplementation(async (cb) => {
        return cb(entityManagerMock);
      });
    });

    it.each([0, -1, 1.5, Number.NaN])('rechaza roleId %s', async (roleId) => {
      await expect(service.replaceRolePermissions(roleId, { permissionIds: [] }))
        .rejects.toThrow(BadRequestException);
    });

    it('rechaza DTO ausente', async () => {
      await expect(service.replaceRolePermissions(1, undefined as any))
        .rejects.toThrow(BadRequestException);
    });

    it('rechaza permissionIds que no sea arreglo', async () => {
      await expect(service.replaceRolePermissions(1, { permissionIds: 'not-array' } as any))
        .rejects.toThrow(BadRequestException);
    });

    it.each([0, -1, 1.5, Number.NaN])('rechaza permissionId %s', async (permissionId) => {
      await expect(service.replaceRolePermissions(1, { permissionIds: [permissionId] }))
        .rejects.toThrow(BadRequestException);
    });

    it('elimina identificadores duplicados', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      const p1 = createPermission(10, 'modulo1', 'codigo1', true);
      transactionalPermissionsRepository.find.mockResolvedValue([p1]);
      transactionalRolePermissionsRepository.delete.mockResolvedValue({});
      transactionalRolePermissionsRepository.save.mockResolvedValue({});

      await service.replaceRolePermissions(2, { permissionIds: [10, 10, 10] });

      expect(transactionalPermissionsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: expect.objectContaining({ value: [10] }) }),
        }),
      );
    });

    it('rechaza rol inexistente', async () => {
      transactionalRolesRepository.findOne.mockResolvedValue(null);

      await expect(service.replaceRolePermissions(1, { permissionIds: [] }))
        .rejects.toThrow(NotFoundException);
    });

    it('rechaza permisos inexistentes', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      transactionalPermissionsRepository.find.mockResolvedValue([]);

      await expect(service.replaceRolePermissions(2, { permissionIds: [10] }))
        .rejects.toThrow(BadRequestException);
    });

    it('rechaza permisos inactivos', async () => {
      // By returning fewer permissions than requested, we simulate missing or inactive
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      transactionalPermissionsRepository.find.mockResolvedValue([]);

      await expect(service.replaceRolePermissions(2, { permissionIds: [10] }))
        .rejects.toThrow(BadRequestException);
    });

    it('permite a un rol configurable quedar sin permisos', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      transactionalRolePermissionsRepository.delete.mockResolvedValue({});

      const result = await service.replaceRolePermissions(2, { permissionIds: [] });

      expect(result).toEqual([]);
      expect(transactionalRolePermissionsRepository.delete).toHaveBeenCalledWith({ roleId: 2 });
      expect(transactionalRolePermissionsRepository.save).not.toHaveBeenCalled();
    });

    it('reemplaza asignaciones dentro de una sola transaccion', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      const p1 = createPermission(10, 'sec.a', 'modulo2', true);
      transactionalPermissionsRepository.find.mockResolvedValue([p1]);
      transactionalRolePermissionsRepository.delete.mockResolvedValue({});
      transactionalRolePermissionsRepository.save.mockResolvedValue({});

      await service.replaceRolePermissions(2, { permissionIds: [10] });

      expect(dataSourceMock.transaction).toHaveBeenCalled();
      expect(transactionalRolePermissionsRepository.delete).toHaveBeenCalled();
      expect(transactionalRolePermissionsRepository.save).toHaveBeenCalled();
      expect(rolesRepository.findOne).not.toHaveBeenCalled(); // Original repo shouldn't be touched
    });

    it('elimina asignaciones antes de insertar las nuevas', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      const p1 = createPermission(10, 'sec.a', 'modulo2', true);
      transactionalPermissionsRepository.find.mockResolvedValue([p1]);

      const callOrder: string[] = [];
      transactionalRolePermissionsRepository.delete.mockImplementation(async () => {
        callOrder.push('delete');
      });
      transactionalRolePermissionsRepository.save.mockImplementation(async () => {
        callOrder.push('save');
      });

      await service.replaceRolePermissions(2, { permissionIds: [10] });

      expect(callOrder).toEqual(['delete', 'save']);
    });

    it('no inserta cuando la lista normalizada queda vacia', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);
      transactionalRolePermissionsRepository.delete.mockResolvedValue({});

      await service.replaceRolePermissions(2, { permissionIds: [] });

      expect(transactionalRolePermissionsRepository.save).not.toHaveBeenCalled();
    });

    it('devuelve permisos ordenados por module y code', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      // Return out of order
      const p1 = createPermission(10, 'codeB', 'modZ', true);
      const p2 = createPermission(11, 'codeA', 'modZ', true);
      const p3 = createPermission(12, 'codeC', 'modA', true);

      transactionalPermissionsRepository.find.mockResolvedValue([p1, p2, p3]);

      const result = await service.replaceRolePermissions(2, { permissionIds: [10, 11, 12] });

      expect(result.map(p => `${p.module}.${p.code}`)).toEqual([
        'modA.codeC',
        'modZ.codeA',
        'modZ.codeB',
      ]);
    });

    it('impide que admin quede sin permisos', async () => {
      const role = createRole(1, 'admin', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      await expect(service.replaceRolePermissions(1, { permissionIds: [] }))
        .rejects.toThrow(ForbiddenException);
    });

    it('impide que admin pierda cualquiera de los 10 permisos esenciales', async () => {
      const role = createRole(1, 'admin', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      const p1 = createPermission(10, 'security.permissions.read', 'security', true);
      // Missing 9 other essentials
      transactionalPermissionsRepository.find.mockResolvedValue([p1]);

      await expect(service.replaceRolePermissions(1, { permissionIds: [10] }))
        .rejects.toThrow(ForbiddenException);
    });

    it('permite actualizar admin cuando conserva exactamente los 10 permisos esenciales', async () => {
      const role = createRole(1, 'admin', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      const essentials = [
        'security.permissions.read',
        'security.roles.assign-permissions',
        'security.roles.create',
        'security.roles.read',
        'security.roles.update',
        'security.users.assign-permissions',
        'security.users.assign-roles',
        'security.users.create',
        'security.users.read',
        'security.users.update',
      ];

      const perms = essentials.map((code, i) => createPermission(i + 1, code, 'security', true));
      const ids = perms.map(p => p.id);

      transactionalPermissionsRepository.find.mockResolvedValue(perms);

      const result = await service.replaceRolePermissions(1, { permissionIds: ids });
      expect(result).toHaveLength(10);
    });

    it('permite que admin conserve los 10 esenciales y tenga permisos adicionales', async () => {
      const role = createRole(1, 'admin', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);

      const essentials = [
        'security.permissions.read',
        'security.roles.assign-permissions',
        'security.roles.create',
        'security.roles.read',
        'security.roles.update',
        'security.users.assign-permissions',
        'security.users.assign-roles',
        'security.users.create',
        'security.users.read',
        'security.users.update',
      ];

      const perms = essentials.map((code, i) => createPermission(i + 1, code, 'security', true));
      const extraPerm = createPermission(99, 'other.code', 'other', true);
      perms.push(extraPerm);
      const ids = perms.map(p => p.id);

      transactionalPermissionsRepository.find.mockResolvedValue(perms);

      const result = await service.replaceRolePermissions(1, { permissionIds: ids });
      expect(result).toHaveLength(11);
    });

    it('si delete falla, save no debe ejecutarse', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);
      const p1 = createPermission(10, 'sec.a', 'modulo2', true);
      transactionalPermissionsRepository.find.mockResolvedValue([p1]);

      transactionalRolePermissionsRepository.delete.mockRejectedValue(new Error('Delete DB Error'));

      await expect(service.replaceRolePermissions(2, { permissionIds: [10] }))
        .rejects.toThrow('Delete DB Error');

      expect(transactionalRolePermissionsRepository.save).not.toHaveBeenCalled();
    });

    it('si save falla, la promesa de transaction debe rechazarse', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);
      const p1 = createPermission(10, 'sec.a', 'modulo2', true);
      transactionalPermissionsRepository.find.mockResolvedValue([p1]);

      transactionalRolePermissionsRepository.delete.mockResolvedValue({});
      transactionalRolePermissionsRepository.save.mockRejectedValue(new Error('Save DB Error'));

      await expect(service.replaceRolePermissions(2, { permissionIds: [10] }))
        .rejects.toThrow('Save DB Error');
    });

    it('los repositorios inyectados no deben usarse para el reemplazo transaccional', async () => {
      const role = createRole(2, 'user', true);
      transactionalRolesRepository.findOne.mockResolvedValue(role);
      transactionalRolePermissionsRepository.delete.mockResolvedValue({});

      await service.replaceRolePermissions(2, { permissionIds: [] });

      expect(rolesRepository.findOne).not.toHaveBeenCalled();
      expect(permissionsRepository.find).not.toHaveBeenCalled();
    });
  });
});

type RepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function createUser(): User {
  return {
    id: 7,
    password: 'password-hash',
    name: 'Usuario de prueba',
    user_name: 'test.user',
    college_number: 'BIO-123',
    telephone: '+58 0000 000 0000',
    key_signing: 'internal-key',
    url_photo: 'user.png',
    url_signature: 'signature.png',
    direction: 'Direccion de prueba',
    position: 'Bioanalista',
    email: 'test@example.com',
    key_recover: 123456,
    request_password: false,
    createdAt: new Date('2026-08-07T00:00:00.000Z'),
    updatedAt: new Date('2026-08-07T01:00:00.000Z'),
    roles: 'admin,annular',
    passwordSignature: 'signature-hash',
    hide_user: false,
  };
}
function createPermission(
  id: number,
  code: string,
  module: string,
  isActive: boolean,
): SecurityPermission {
  return {
    id,
    code,
    name: code,
    description: null,
    module,
    isActive,
    createdAt: new Date('2026-08-07T00:00:00.000Z'),
    updatedAt: new Date('2026-08-07T00:00:00.000Z'),
  };
}
function createRole(
  id: number,
  code: string,
  isSystem: boolean,
): SecurityRole {
  return {
    id,
    code,
    name: code,
    description: null,
    isSystem,
    isActive: true,
    createdAt: new Date('2026-08-07T00:00:00.000Z'),
    updatedAt: new Date('2026-08-07T00:00:00.000Z'),
  };
}
