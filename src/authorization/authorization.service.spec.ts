import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRolePermission } from './entities/security-role-permission.entity';
import { SecurityRole } from './entities/security-role.entity';
import {
  SecurityPermissionEffect,
  SecurityUserPermissionOverride,
} from './entities/security-user-permission-override.entity';
import { SecurityUserRole } from './entities/security-user-role.entity';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let usersRepository: MockRepository<User>;
  let rolesRepository: MockRepository<SecurityRole>;
  let permissionsRepository: MockRepository<SecurityPermission>;
  let rolePermissionsRepository: MockRepository<SecurityRolePermission>;
  let userRolesRepository: MockRepository<SecurityUserRole>;
  let userOverridesRepository: MockRepository<SecurityUserPermissionOverride>;

  beforeEach(() => {
    usersRepository = createRepositoryMock<User>();
    rolesRepository = createRepositoryMock<SecurityRole>();
    permissionsRepository = createRepositoryMock<SecurityPermission>();
    rolePermissionsRepository =
      createRepositoryMock<SecurityRolePermission>();
    userRolesRepository = createRepositoryMock<SecurityUserRole>();
    userOverridesRepository =
      createRepositoryMock<SecurityUserPermissionOverride>();

    service = new AuthorizationService(
      usersRepository as unknown as Repository<User>,
      rolesRepository as unknown as Repository<SecurityRole>,
      permissionsRepository as unknown as Repository<SecurityPermission>,
      rolePermissionsRepository as unknown as Repository<SecurityRolePermission>,
      userRolesRepository as unknown as Repository<SecurityUserRole>,
      userOverridesRepository as unknown as Repository<SecurityUserPermissionOverride>,
    );
  });

  it('concede un permiso heredado de un rol activo', async () => {
    configureActiveUser();

    userRolesRepository.find.mockResolvedValue([
      userRoleAssignment(1, 10),
    ]);

    rolesRepository.find.mockResolvedValue([
      activeRole(10, 'user'),
    ]);

    rolePermissionsRepository.find.mockResolvedValue([
      rolePermissionAssignment(10, 100),
    ]);

    userOverridesRepository.find.mockResolvedValue([]);

    permissionsRepository.find.mockResolvedValue([
      activePermission(100, 'parasiticforms.read'),
    ]);

    await expect(
      service.hasPermission(1, 'parasiticforms.read'),
    ).resolves.toBe(true);
  });

  it('concede un permiso allow directo sin rol', async () => {
    configureActiveUser();

    userRolesRepository.find.mockResolvedValue([]);
    rolesRepository.find.mockResolvedValue([]);
    rolePermissionsRepository.find.mockResolvedValue([]);

    userOverridesRepository.find.mockResolvedValue([
      permissionOverride(
        1,
        101,
        SecurityPermissionEffect.Allow,
      ),
    ]);

    permissionsRepository.find.mockResolvedValue([
      activePermission(101, 'parasiticforms.create'),
    ]);

    await expect(
      service.hasPermission(1, 'parasiticforms.create'),
    ).resolves.toBe(true);
  });

  it('hace prevalecer deny directo sobre permiso heredado', async () => {
    configureActiveUser();

    userRolesRepository.find.mockResolvedValue([
      userRoleAssignment(1, 10),
    ]);

    rolesRepository.find.mockResolvedValue([
      activeRole(10, 'admin'),
    ]);

    rolePermissionsRepository.find.mockResolvedValue([
      rolePermissionAssignment(10, 102),
    ]);

    userOverridesRepository.find.mockResolvedValue([
      permissionOverride(
        1,
        102,
        SecurityPermissionEffect.Deny,
      ),
    ]);

    permissionsRepository.find.mockResolvedValue([
      activePermission(102, 'parasiticforms.update'),
    ]);

    const context = await service.resolveContext(1);

    expect(context).toEqual({
      userId: 1,
      roles: ['admin'],
      permissions: [],
      deniedPermissions: ['parasiticforms.update'],
    });

    await expect(
      service.hasPermission(1, 'parasiticforms.update'),
    ).resolves.toBe(false);
  });

  it('ignora roles inactivos', async () => {
    configureActiveUser();

    userRolesRepository.find.mockResolvedValue([
      userRoleAssignment(1, 10),
    ]);

    rolesRepository.find.mockResolvedValue([]);
    rolePermissionsRepository.find.mockResolvedValue([]);
    userOverridesRepository.find.mockResolvedValue([]);
    permissionsRepository.find.mockResolvedValue([]);

    await expect(
      service.hasPermission(1, 'security.users.read'),
    ).resolves.toBe(false);
  });

  it('ignora permisos inactivos', async () => {
    configureActiveUser();

    userRolesRepository.find.mockResolvedValue([
      userRoleAssignment(1, 10),
    ]);

    rolesRepository.find.mockResolvedValue([
      activeRole(10, 'admin'),
    ]);

    rolePermissionsRepository.find.mockResolvedValue([
      rolePermissionAssignment(10, 103),
    ]);

    userOverridesRepository.find.mockResolvedValue([]);
    permissionsRepository.find.mockResolvedValue([]);

    await expect(
      service.hasPermission(1, 'security.users.read'),
    ).resolves.toBe(false);
  });

  it('deniega por defecto cuando no existe asignacion', async () => {
    configureActiveUser();

    userRolesRepository.find.mockResolvedValue([]);
    rolesRepository.find.mockResolvedValue([]);
    rolePermissionsRepository.find.mockResolvedValue([]);
    userOverridesRepository.find.mockResolvedValue([]);
    permissionsRepository.find.mockResolvedValue([]);

    await expect(
      service.hasPermission(1, 'security.users.update'),
    ).resolves.toBe(false);
  });

  it('rechaza usuarios inexistentes u ocultos', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.resolveContext(1)).resolves.toBeNull();

    await expect(
      service.hasPermission(1, 'parasiticforms.read'),
    ).resolves.toBe(false);

    expect(userRolesRepository.find).not.toHaveBeenCalled();
  });

  it('normaliza permisos y exige todos los solicitados', async () => {
    configureActiveUser();

    userRolesRepository.find.mockResolvedValue([
      userRoleAssignment(1, 10),
    ]);

    rolesRepository.find.mockResolvedValue([
      activeRole(10, 'admin'),
    ]);

    rolePermissionsRepository.find.mockResolvedValue([
      rolePermissionAssignment(10, 100),
      rolePermissionAssignment(10, 101),
    ]);

    userOverridesRepository.find.mockResolvedValue([]);

    permissionsRepository.find.mockResolvedValue([
      activePermission(100, 'parasiticforms.read'),
      activePermission(101, 'parasiticforms.create'),
    ]);

    await expect(
      service.hasAllPermissions(1, [
        ' ParasiticForms.Read ',
        'parasiticforms.create',
        'parasiticforms.read',
      ]),
    ).resolves.toBe(true);

    await expect(
      service.hasAllPermissions(1, [
        'parasiticforms.read',
        'parasiticforms.update',
      ]),
    ).resolves.toBe(false);
  });

  it('acepta una lista vacia de permisos requeridos', async () => {
    await expect(
      service.hasAllPermissions(1, []),
    ).resolves.toBe(true);

    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });

  function configureActiveUser() {
    usersRepository.findOne.mockResolvedValue({
      id: 1,
    } as User);
  }
});

type MockRepository<T> = {
  findOne: jest.Mock<Promise<T | null>, [unknown?]>;
  find: jest.Mock<Promise<T[]>, [unknown?]>;
};

function createRepositoryMock<T>(): MockRepository<T> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
  };
}

function activeRole(
  id: number,
  code: string,
): SecurityRole {
  return {
    id,
    code,
    isActive: true,
  } as SecurityRole;
}

function activePermission(
  id: number,
  code: string,
): SecurityPermission {
  return {
    id,
    code,
    isActive: true,
  } as SecurityPermission;
}

function userRoleAssignment(
  userId: number,
  roleId: number,
): SecurityUserRole {
  return {
    userId,
    roleId,
  } as SecurityUserRole;
}

function rolePermissionAssignment(
  roleId: number,
  permissionId: number,
): SecurityRolePermission {
  return {
    roleId,
    permissionId,
  } as SecurityRolePermission;
}

function permissionOverride(
  userId: number,
  permissionId: number,
  effect: SecurityPermissionEffect,
): SecurityUserPermissionOverride {
  return {
    userId,
    permissionId,
    effect,
  } as SecurityUserPermissionOverride;
}
