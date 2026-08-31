import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';

describe('LaboratoryController', () => {
  let controller: LaboratoryController;
  let getPublicLaboratory: jest.Mock;
  let getPublicLaboratorySetting: jest.Mock;
  let updateLaboratory: jest.Mock;
  let testEmailConnection: jest.Mock;

  beforeEach(() => {
    getPublicLaboratory = jest.fn();
    getPublicLaboratorySetting = jest.fn();
    updateLaboratory = jest.fn();
    testEmailConnection = jest.fn();

    const laboratoryService = {
      getPublicLaboratory,
      getPublicLaboratorySetting,
      updateLaboratory,
      testEmailConnection,
    } as unknown as LaboratoryService;

    controller = new LaboratoryController(laboratoryService);
  });

  it('delega la consulta individual a la proyeccion segura', async () => {
    getPublicLaboratory.mockResolvedValue({
      id: 1,
      sendEmail: {
        pass: '',
      },
    });

    await expect(controller.getLaboratory(1)).resolves.toEqual({
      id: 1,
      sendEmail: {
        pass: '',
      },
    });

    expect(getPublicLaboratory).toHaveBeenCalledWith(1);
  });

  it('delega el listado a la proyeccion segura', async () => {
    getPublicLaboratorySetting.mockResolvedValue([
      {
        id: 1,
        sendEmail: {
          pass: '',
        },
      },
    ]);

    await expect(controller.getLaboratorySetting()).resolves.toEqual([
      {
        id: 1,
        sendEmail: {
          pass: '',
        },
      },
    ]);

    expect(getPublicLaboratorySetting).toHaveBeenCalledTimes(1);
  });

  it('mantiene la actualizacion administrativa', async () => {
    updateLaboratory.mockResolvedValue({
      id: 1,
      name: 'Laboratorio actualizado',
    });

    await expect(
      controller.updateLaboratory(authenticatedRequest(5), 1, {
        name: 'Laboratorio actualizado',
      }),
    ).resolves.toEqual({
      id: 1,
      name: 'Laboratorio actualizado',
    });

    expect(updateLaboratory).toHaveBeenCalledWith(
      1,
      { name: 'Laboratorio actualizado' },
      5,
    );
  });

  it('prueba la conexion con actor y sin guardar', async () => {
    testEmailConnection.mockResolvedValue({ success: true, mode: 'gmail' });
    const sendEmail = { isGmail: true, user: 'mail@example.com', pass: '', from: 'mail@example.com' };
    await expect(controller.testEmailConnection(authenticatedRequest(9), 1, { sendEmail })).resolves.toEqual({ success: true, mode: 'gmail' });
    expect(testEmailConnection).toHaveBeenCalledWith(1, sendEmail, 9);
    expect(updateLaboratory).not.toHaveBeenCalled();
  });
  it('rechaza una prueba sin configuracion', () => {
    expect(() => controller.testEmailConnection(authenticatedRequest(9), 1, {} as never)).toThrow(
      new BadRequestException('LABORATORY_EMAIL_SETTINGS_REQUIRED'),
    );
    expect(testEmailConnection).not.toHaveBeenCalled();
  });
  it('mantiene la actualizacion del logo', async () => {
    updateLaboratory.mockResolvedValue({
      id: 1,
      logo: 'logo_lab.png',
    });

    const file = {
      filename: 'logo_lab.png',
      path: 'public/images/logo_lab.png',
    } as Express.Multer.File;

    await expect(controller.uploadFile(authenticatedRequest(7), 1, file)).resolves.toEqual({
      id: 1,
      logo: 'logo_lab.png',
    });

    expect(updateLaboratory).toHaveBeenCalledWith(
      1,
      { logo: 'laboratories/1/identity/logo_lab.png' },
      7,
      'laboratory.logo.updated',
    );
  });

  it('rechaza una carga sin archivo', async () => {
    await expect(controller.uploadFile(authenticatedRequest(7), 1)).rejects.toThrow(
      new BadRequestException('LABORATORY_LOGO_REQUIRED'),
    );
    expect(updateLaboratory).not.toHaveBeenCalled();
  });

  it.each([
    ['getLaboratory', 'laboratory.read'],
    ['getLaboratorySetting', 'laboratory.read'],
    ['updateLaboratory', 'laboratory.update'],
    ['testEmailConnection', 'laboratory.update'],
    ['uploadFile', 'laboratory.upload-logo'],
  ] as const)('protege %s con JWT, PermissionGuard y %s', (methodName, permission) => {
    const method = controllerMethod(methodName);
    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([JwtUserGuard, PermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, method)).toEqual([permission]);
  });
});

function authenticatedRequest(userId: number): SecurityAuthenticatedRequest {
  return { user: { userId, username: 'tester' } };
}

function controllerMethod(
  methodName:
    | 'getLaboratory'
    | 'updateLaboratory'
    | 'getLaboratorySetting'
    | 'testEmailConnection'
    | 'uploadFile',
) {
  return LaboratoryController.prototype[methodName];
}
