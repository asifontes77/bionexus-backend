import { DataSource, Repository } from 'typeorm';
import { SecurityAuditService } from './security-audit.service';
import { AuthorizationAdministrationService } from '../authorization/authorization-administration.service';
import { SecurityRole } from '../authorization/entities/security-role.entity';

describe('role security audit events', () => {
  let service: AuthorizationAdministrationService;
  let directRolesRepository: Record<string, jest.Mock>;
  let transactionalRolesRepository: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };
  let auditService: { write: jest.Mock };
  let manager: { getRepository: jest.Mock };

  beforeEach(() => {
    directRolesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    transactionalRolesRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === SecurityRole) return transactionalRolesRepository;
        throw new Error('UNKNOWN_ENTITY');
      }),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    auditService = {
      write: jest.fn(async () => undefined),
    };
    service = new AuthorizationAdministrationService(
      directRolesRepository as unknown as Repository<SecurityRole>,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      dataSource as unknown as DataSource,
      auditService as unknown as SecurityAuditService,
    );
  });

  it('crea rol y auditoria en la misma transaccion', async () => {
    transactionalRolesRepository.findOne.mockResolvedValue(null);
    transactionalRolesRepository.save.mockImplementation(async (value) => ({
      ...value,
      id: 4,
    }));

    await expect(
      service.createRole(
        {
          code: 'supervisor',
          name: 'Supervisor',
        },
        7,
      ),
    ).resolves.toMatchObject({
      id: 4,
      code: 'supervisor',
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(directRolesRepository.save).not.toHaveBeenCalled();
    expect(auditService.write).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        actorUserId: 7,
        action: 'security.role.created',
        entityType: 'security_role',
        entityId: 4,
      }),
    );
  });

  it('actualiza rol y auditoria en la misma transaccion', async () => {
    const role = createRole();
    transactionalRolesRepository.findOne.mockResolvedValue(role);

    await expect(
      service.updateRole(
        4,
        {
          name: 'Supervisor operativo',
          isActive: false,
        },
        7,
      ),
    ).resolves.toMatchObject({
      id: 4,
      name: 'Supervisor operativo',
      isActive: false,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(directRolesRepository.save).not.toHaveBeenCalled();
    expect(auditService.write).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        actorUserId: 7,
        action: 'security.role.updated',
        entityType: 'security_role',
        entityId: 4,
        metadata: expect.objectContaining({
          changedFields: ['name', 'isActive'],
        }),
      }),
    );
  });

  it('propaga el fallo de auditoria para revertir la transaccion', async () => {
    transactionalRolesRepository.findOne.mockResolvedValue(null);
    transactionalRolesRepository.save.mockImplementation(async (value) => ({
      ...value,
      id: 4,
    }));
    auditService.write.mockRejectedValue(new Error('AUDIT_WRITE_FAILED'));

    await expect(
      service.createRole(
        {
          code: 'supervisor',
          name: 'Supervisor',
        },
        7,
      ),
    ).rejects.toThrow('AUDIT_WRITE_FAILED');
  });

  it('preserva la ruta directa cuando no existe actor', async () => {
    directRolesRepository.findOne.mockResolvedValue(null);
    directRolesRepository.save.mockImplementation(async (value) => ({
      ...value,
      id: 4,
    }));

    await service.createRole({
      code: 'supervisor',
      name: 'Supervisor',
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(auditService.write).not.toHaveBeenCalled();
    expect(directRolesRepository.save).toHaveBeenCalledTimes(1);
  });
});

function createRole(): SecurityRole {
  return {
    id: 4,
    code: 'supervisor',
    name: 'Supervisor',
    description: null,
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
