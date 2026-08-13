import { DataSource, Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { AuthorizationService } from './authorization.service';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRole } from './entities/security-role.entity';
import { SecurityRolePermission } from './entities/security-role-permission.entity';
import { SecurityUserPermissionOverride } from './entities/security-user-permission-override.entity';
import { SecurityUserRole } from './entities/security-user-role.entity';

describe('AuthorizationAdministrationService user list', () => {
  let service: AuthorizationAdministrationService;
  let rolesRepository: Record<string, jest.Mock>;
  let userRepository: Record<string, jest.Mock>;
  let userRolesRepository: Record<string, jest.Mock>;

  beforeEach(() => {
    rolesRepository = { find: jest.fn() };
    userRepository = { find: jest.fn() };
    userRolesRepository = { find: jest.fn() };

    service = new AuthorizationAdministrationService(
      rolesRepository as unknown as Repository<SecurityRole>,
      {} as Repository<SecurityPermission>,
      {} as Repository<SecurityRolePermission>,
      userRepository as unknown as Repository<User>,
      userRolesRepository as unknown as Repository<SecurityUserRole>,
      {} as Repository<SecurityUserPermissionOverride>,
      {} as AuthorizationService,
      {} as DataSource,
    );
  });

  it('returns an empty list without querying assignments when no users exist', async () => {
    userRepository.find.mockResolvedValue([]);

    await expect(service.getUsersAdministration()).resolves.toEqual([]);
    expect(userRolesRepository.find).not.toHaveBeenCalled();
    expect(rolesRepository.find).not.toHaveBeenCalled();
  });

  it('loads users, assignments and roles in bulk and sorts roles by code', async () => {
    userRepository.find.mockResolvedValue([createUser(7, 'Zeta', 'user')]);
    userRolesRepository.find.mockResolvedValue([
      { userId: 7, roleId: 3 },
      { userId: 7, roleId: 1 },
    ]);
    rolesRepository.find.mockResolvedValue([
      createRole(3, 'annular', 'Anular'),
      createRole(1, 'admin', 'Administrador'),
    ]);

    await expect(service.getUsersAdministration()).resolves.toMatchObject([
      {
        user: { id: 7, roles: 'user' },
        assignedRoles: [{ code: 'admin' }, { code: 'annular' }],
      },
    ]);
    expect(userRepository.find).toHaveBeenCalledTimes(1);
    expect(userRolesRepository.find).toHaveBeenCalledTimes(1);
    expect(rolesRepository.find).toHaveBeenCalledTimes(1);
  });

  it('returns users without normalized roles when no assignments exist', async () => {
    userRepository.find.mockResolvedValue([createUser(8, 'Sin rol', 'legacy')]);
    userRolesRepository.find.mockResolvedValue([]);

    await expect(service.getUsersAdministration()).resolves.toMatchObject([
      { user: { id: 8 }, assignedRoles: [] },
    ]);
    expect(rolesRepository.find).not.toHaveBeenCalled();
  });
});

function createUser(id: number, name: string, legacyRole: string): User {
  return {
    id,
    name,
    user_name: name.toLowerCase().replace(/\s+/g, '-'),
    college_number: null,
    telephone: '',
    key_signing: null,
    url_photo: null,
    url_signature: null,
    direction: null,
    position: null,
    email: null,
    key_recover: null,
    request_password: false,
    password: 'hash',
    passwordSignature: null,
    roles: legacyRole,
    hide_user: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createRole(id: number, code: string, name: string): SecurityRole {
  return {
    id,
    code,
    name,
    description: null,
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
