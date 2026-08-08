import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationService } from '../authorization/authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { ParasiticformsController } from './parasiticforms.controller';
import { Parasiticforms } from './parasiticforms.entity';
import { ParasiticformsService } from './parasiticforms.service';

describe('ParasiticformsController', () => {
  let controller: ParasiticformsController;
  let service: {
    getParasiticformsLists: jest.Mock;
    getParasiticformsListsOrder: jest.Mock;
    getParasiticforms: jest.Mock;
    createParasiticforms: jest.Mock;
    updateParasiticforms: jest.Mock;
  };
  let authorizationService: {
    hasAllPermissions: jest.Mock;
  };

  beforeEach(() => {
    service = {
      getParasiticformsLists: jest.fn(),
      getParasiticformsListsOrder: jest.fn(),
      getParasiticforms: jest.fn(),
      createParasiticforms: jest.fn(),
      updateParasiticforms: jest.fn(),
    };

    authorizationService = {
      hasAllPermissions: jest.fn(),
    };

    controller = new ParasiticformsController(
      service as unknown as ParasiticformsService,
      authorizationService as unknown as AuthorizationService,
    );
  });

  describe('permisos estaticos', () => {
    it.each([
      ['getParasiticformsLists', 'parasiticforms.read'],
      ['getParasiticformsListsOrder', 'parasiticforms.read'],
      ['getParasiticforms', 'parasiticforms.read'],
      ['createParasiticforms', 'parasiticforms.create'],
    ] as const)(
      'protege %s con JWT, PermissionGuard y %s',
      (methodName, permission) => {
        const method = ParasiticformsController.prototype[methodName];

        const guards = Reflect.getMetadata(GUARDS_METADATA, method);

        const permissions = Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          method,
        );

        expect(guards).toContain(JwtUserGuard);
        expect(guards).toContain(PermissionGuard);
        expect(permissions).toEqual([permission]);
      },
    );

    it('mantiene PATCH con JWT y autorizacion dinamica', () => {
      const method = ParasiticformsController.prototype.updateParasiticforms;

      const guards = Reflect.getMetadata(GUARDS_METADATA, method);

      const permissions = Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, method);

      expect(guards).toContain(JwtUserGuard);
      expect(guards).not.toContain(PermissionGuard);
      expect(permissions).toBeUndefined();
    });
  });

  describe('delegacion de operaciones estaticas', () => {
    it('delega el listado administrativo', async () => {
      const records = [parasiticform(1, 'Giardia', false)];

      service.getParasiticformsLists.mockResolvedValue(records);

      await expect(controller.getParasiticformsLists()).resolves.toBe(records);

      expect(service.getParasiticformsLists).toHaveBeenCalledTimes(1);
    });

    it('delega el listado operativo', async () => {
      const records = [parasiticform(1, 'Giardia', false)];

      service.getParasiticformsListsOrder.mockResolvedValue(records);

      await expect(controller.getParasiticformsListsOrder()).resolves.toBe(
        records,
      );

      expect(service.getParasiticformsListsOrder).toHaveBeenCalledTimes(1);
    });

    it('delega la consulta por identificador', async () => {
      const record = parasiticform(7, 'Blastocystis', false);

      service.getParasiticforms.mockResolvedValue(record);

      await expect(controller.getParasiticforms(7)).resolves.toBe(record);

      expect(service.getParasiticforms).toHaveBeenCalledWith(7);
    });

    it('delega la creacion con el payload recibido', async () => {
      const payload = {
        description: 'Giardia',
      };

      const record = parasiticform(8, 'Giardia', false);

      service.createParasiticforms.mockResolvedValue(record);

      await expect(controller.createParasiticforms(payload)).resolves.toBe(
        record,
      );

      expect(service.createParasiticforms).toHaveBeenCalledWith(payload);
    });
  });

  describe('autorizacion dinamica de PATCH', () => {
    it('exige update cuando cambia description', async () => {
      const payload = {
        description: 'Giardia',
      };

      const record = parasiticform(1, 'Giardia', false);

      authorizationService.hasAllPermissions.mockResolvedValue(true);

      service.updateParasiticforms.mockResolvedValue(record);

      await expect(
        controller.updateParasiticforms(authenticatedRequest(5), 1, payload),
      ).resolves.toBe(record);

      expect(authorizationService.hasAllPermissions).toHaveBeenCalledWith(5, [
        'parasiticforms.update',
      ]);

      expect(service.updateParasiticforms).toHaveBeenCalledWith(1, payload);
    });

    it('exige change-status cuando cambia annulled', async () => {
      const payload = {
        annulled: true,
      };

      const record = parasiticform(1, 'Giardia', true);

      authorizationService.hasAllPermissions.mockResolvedValue(true);

      service.updateParasiticforms.mockResolvedValue(record);

      await expect(
        controller.updateParasiticforms(authenticatedRequest(5), 1, payload),
      ).resolves.toBe(record);

      expect(authorizationService.hasAllPermissions).toHaveBeenCalledWith(5, [
        'parasiticforms.change-status',
      ]);
    });

    it('exige ambos permisos cuando cambia descripcion y estado', async () => {
      const payload = {
        description: 'Giardia',
        annulled: true,
      };

      authorizationService.hasAllPermissions.mockResolvedValue(true);

      service.updateParasiticforms.mockResolvedValue(
        parasiticform(1, 'Giardia', true),
      );

      await controller.updateParasiticforms(
        authenticatedRequest(9),
        1,
        payload,
      );

      expect(authorizationService.hasAllPermissions).toHaveBeenCalledWith(9, [
        'parasiticforms.update',
        'parasiticforms.change-status',
      ]);

      expect(service.updateParasiticforms).toHaveBeenCalledWith(1, payload);
    });

    it('rechaza la actualizacion cuando faltan permisos', async () => {
      authorizationService.hasAllPermissions.mockResolvedValue(false);

      await expect(
        controller.updateParasiticforms(authenticatedRequest(5), 1, {
          description: 'Giardia',
        }),
      ).rejects.toThrow(
        new ForbiddenException('PARASITICFORM_PERMISSION_REQUIRED'),
      );

      expect(service.updateParasiticforms).not.toHaveBeenCalled();
    });

    it.each([
      [{}],
      [{ user: {} }],
      [{ user: { userId: 0 } }],
      [{ user: { userId: -1 } }],
    ])('rechaza una identidad JWT invalida', async (request) => {
      await expect(
        controller.updateParasiticforms(request, 1, {
          description: 'Giardia',
        }),
      ).rejects.toThrow(
        new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE'),
      );

      expect(authorizationService.hasAllPermissions).not.toHaveBeenCalled();

      expect(service.updateParasiticforms).not.toHaveBeenCalled();
    });

    it('delega un payload vacio al servicio para su validacion', async () => {
      service.updateParasiticforms.mockRejectedValue(
        new Error('PARASITICFORM_UPDATE_REQUIRED'),
      );

      await expect(
        controller.updateParasiticforms(authenticatedRequest(5), 1, {}),
      ).rejects.toThrow('PARASITICFORM_UPDATE_REQUIRED');

      expect(authorizationService.hasAllPermissions).not.toHaveBeenCalled();

      expect(service.updateParasiticforms).toHaveBeenCalledWith(1, {});
    });
  });

  function authenticatedRequest(userId: number): {
    user: {
      userId: number;
      username: string;
    };
  } {
    return {
      user: {
        userId,
        username: 'tester',
      },
    };
  }

  function parasiticform(
    id: number,
    description: string,
    annulled: boolean,
  ): Parasiticforms {
    return {
      id,
      description,
      annulled,
    };
  }
});
