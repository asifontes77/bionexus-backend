import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRole } from './entities/security-role.entity';

describe('AuthorizationAdministrationService', () => {
  let service: AuthorizationAdministrationService;
  let rolesRepository: RepositoryMock;
  let permissionsRepository: RepositoryMock;

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
      create: jest.fn(),
      save: jest.fn(),
    };

    service = new AuthorizationAdministrationService(
      rolesRepository as unknown as Repository<SecurityRole>,
      permissionsRepository as unknown as Repository<SecurityPermission>,
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
});

type RepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

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
