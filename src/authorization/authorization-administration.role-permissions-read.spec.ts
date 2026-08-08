import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRole } from './entities/security-role.entity';

describe('AuthorizationAdministrationService getRolePermissions', () => {
  let service: AuthorizationAdministrationService;
  let rolesRepository: {
    findOne: jest.Mock;
  };
  let permissionsRepository: {
    find: jest.Mock;
  };
  let rolePermissionsRepository: {
    find: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };

  beforeEach(() => {
    rolesRepository = {
      findOne: jest.fn(),
    };

    permissionsRepository = {
      find: jest.fn(),
    };

    rolePermissionsRepository = {
      find: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    service = new AuthorizationAdministrationService(
      rolesRepository as unknown as Repository<SecurityRole>,
      permissionsRepository as unknown as Repository<SecurityPermission>,
      rolePermissionsRepository as unknown as Repository<never>,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
    );
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
        service.getRolePermissions(roleId),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(rolesRepository.findOne).not.toHaveBeenCalled();
      expect(rolePermissionsRepository.find).not.toHaveBeenCalled();
      expect(permissionsRepository.find).not.toHaveBeenCalled();
    },
  );

  it('rechaza un rol inexistente', async () => {
    rolesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.getRolePermissions(999),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(rolePermissionsRepository.find).not.toHaveBeenCalled();
    expect(permissionsRepository.find).not.toHaveBeenCalled();
  });

  it('devuelve una lista vacia cuando no existen asignaciones', async () => {
    rolesRepository.findOne.mockResolvedValue(
      createRole(2, 'operator'),
    );

    rolePermissionsRepository.find.mockResolvedValue([]);

    await expect(
      service.getRolePermissions(2),
    ).resolves.toEqual([]);

    expect(rolePermissionsRepository.find).toHaveBeenCalledWith({
      where: {
        roleId: 2,
      },
    });

    expect(permissionsRepository.find).not.toHaveBeenCalled();
  });

  it('normaliza asignaciones y devuelve permisos activos e inactivos ordenados', async () => {
    const reportsPermission = createPermission(
      10,
      'reports.write',
      'reports',
      true,
    );

    const readPermission = createPermission(
      11,
      'patients.read',
      'patients',
      true,
    );

    const inactivePermission = createPermission(
      12,
      'patients.cancel',
      'patients',
      false,
    );

    rolesRepository.findOne.mockResolvedValue(
      createRole(2, 'operator'),
    );

    rolePermissionsRepository.find.mockResolvedValue([
      {
        roleId: 2,
        permissionId: 10,
      },
      {
        roleId: 2,
        permissionId: 11,
      },
      {
        roleId: 2,
        permissionId: 12,
      },
      {
        roleId: 2,
        permissionId: 11,
      },
      {
        roleId: 2,
        permissionId: 0,
      },
      {
        roleId: 2,
        permissionId: -1,
      },
      {
        roleId: 2,
        permissionId: 1.5,
      },
    ]);

    permissionsRepository.find.mockResolvedValue([
      reportsPermission,
      readPermission,
      inactivePermission,
    ]);

    const result = await service.getRolePermissions(2);

    expect(result.map((permission) => permission.code)).toEqual([
      'patients.cancel',
      'patients.read',
      'reports.write',
    ]);

    expect(result[0].isActive).toBe(false);

    expect(permissionsRepository.find).toHaveBeenCalledWith({
      where: {
        id: In([
          10,
          11,
          12,
        ]),
      },
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});

function createRole(
  id: number,
  code: string,
): SecurityRole {
  return {
    id,
    code,
    name: code,
    description: null,
    isSystem: false,
    isActive: true,
    createdAt: new Date('2026-08-07T00:00:00.000Z'),
    updatedAt: new Date('2026-08-07T00:00:00.000Z'),
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
