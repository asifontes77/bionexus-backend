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
import { SecurityPermission } from './entities/security-permission.entity';
import { PermissionGuard } from './guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';

describe('AuthorizationController getRolePermissions', () => {
  let controller: AuthorizationController;
  let administrationService: {
    getRolePermissions: jest.Mock;
  };

  beforeEach(() => {
    administrationService = {
      getRolePermissions: jest.fn(),
    };

    controller = new AuthorizationController(
      {
        resolveContext: jest.fn(),
      } as unknown as AuthorizationService,
      administrationService as unknown as AuthorizationAdministrationService,
    );
  });

  it('delega la consulta de permisos asignados al rol', async () => {
    const permissions = [
      createPermission(10, 'patients.read', 'patients', true),
      createPermission(11, 'users.legacy', 'users', false),
    ];

    administrationService.getRolePermissions.mockResolvedValue(permissions);

    await expect(controller.getRolePermissions(4)).resolves.toEqual(
      permissions,
    );

    expect(administrationService.getRolePermissions).toHaveBeenCalledTimes(1);

    expect(administrationService.getRolePermissions).toHaveBeenCalledWith(4);
  });

  it('registra la consulta como GET roles por id y permissions', () => {
    const method = AuthorizationController.prototype.getRolePermissions;

    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe(
      'roles/:id/permissions',
    );

    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(
      RequestMethod.GET,
    );
  });

  it('protege la consulta con JWT y PermissionGuard', () => {
    const method = AuthorizationController.prototype.getRolePermissions;

    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
      JwtUserGuard,
      PermissionGuard,
    ]);
  });

  it('requiere lectura de roles y permisos', () => {
    const method = AuthorizationController.prototype.getRolePermissions;

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, method)).toEqual([
      'security.roles.read',
      'security.permissions.read',
    ]);
  });
});

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
