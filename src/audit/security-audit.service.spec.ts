import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SecurityAuditLog } from './security-audit-log.entity';
import { getSecurityAuditActorUserId } from './security-audit-context';
import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;
  let create: jest.Mock;
  let save: jest.Mock;
  let manager: EntityManager;

  beforeEach(() => {
    create = jest.fn((value) => value);
    save = jest.fn(async (value) => value);
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity !== SecurityAuditLog) {
          throw new Error('UNKNOWN_ENTITY');
        }

        return { create, save };
      }),
    } as unknown as EntityManager;
    service = new SecurityAuditService();
  });

  it('persiste un evento seguro con actor autenticado', async () => {
    await service.write(manager, {
      actorUserId: 7,
      action: 'security.user.roles.replaced',
      entityType: 'user',
      entityId: 8,
      summary: 'Roles de usuario actualizados',
      metadata: {
        beforeRoleCodes: ['user'],
        afterRoleCodes: ['admin'],
      },
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 7,
        action: 'security.user.roles.replaced',
        entityType: 'user',
        entityId: '8',
        outcome: 'success',
      }),
    );
  });

  it('elimina metadatos sensibles', async () => {
    await service.write(manager, {
      actorUserId: 7,
      action: 'security.user.updated',
      entityType: 'user',
      entityId: 8,
      summary: 'Usuario actualizado',
      metadata: {
        changedFields: ['name'],
        password: 'secret',
        token: 'jwt',
      },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          changedFields: ['name'],
        },
      }),
    );
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rechaza actor invalido %s',
    async (actorUserId) => {
      await expect(
        service.write(manager, {
          actorUserId,
          action: 'security.user.updated',
          entityType: 'user',
          summary: 'Usuario actualizado',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(save).not.toHaveBeenCalled();
    },
  );
  it('usa IP y User-Agent capturados cuando el input no los especifica', async () => {
    getSecurityAuditActorUserId({
      user: { userId: 7 },
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Bio Nexus audit test',
      },
    });

    await service.write(manager, {
      actorUserId: 7,
      action: 'security.user.updated',
      entityType: 'user',
      entityId: 8,
      summary: 'Usuario actualizado',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '127.0.0.1',
        userAgent: 'Bio Nexus audit test',
      }),
    );
  });

});
