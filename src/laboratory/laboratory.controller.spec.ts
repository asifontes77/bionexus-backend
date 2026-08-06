import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';

describe('LaboratoryController', () => {
  let controller: LaboratoryController;
  let getPublicLaboratory: jest.Mock;
  let getPublicLaboratorySetting: jest.Mock;
  let updateLaboratory: jest.Mock;

  beforeEach(() => {
    getPublicLaboratory = jest.fn();
    getPublicLaboratorySetting = jest.fn();
    updateLaboratory = jest.fn();

    const laboratoryService = {
      getPublicLaboratory,
      getPublicLaboratorySetting,
      updateLaboratory,
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
      controller.updateLaboratory(1, {
        name: 'Laboratorio actualizado',
      }),
    ).resolves.toEqual({
      id: 1,
      name: 'Laboratorio actualizado',
    });

    expect(updateLaboratory).toHaveBeenCalledWith(1, {
      name: 'Laboratorio actualizado',
    });
  });

  it('mantiene la actualizacion del logo', async () => {
    updateLaboratory.mockResolvedValue({
      id: 1,
      logo: 'logo_lab.png',
    });

    const file = {
      filename: 'logo_lab.png',
    } as Express.Multer.File;

    await expect(controller.uploadFile(file)).resolves.toEqual({
      id: 1,
      logo: 'logo_lab.png',
    });

    expect(updateLaboratory).toHaveBeenCalledWith(1, {
      logo: 'logo_lab.png',
    });
  });

  it.each([
    ['getLaboratory', controllerMethod('getLaboratory')],
    ['updateLaboratory', controllerMethod('updateLaboratory')],
    ['getLaboratorySetting', controllerMethod('getLaboratorySetting')],
    ['uploadFile', controllerMethod('uploadFile')],
  ])('protege %s con JwtUserGuard', (_name, method) => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, method);

    expect(guards).toContain(JwtUserGuard);
  });
});

function controllerMethod(
  methodName:
    | 'getLaboratory'
    | 'updateLaboratory'
    | 'getLaboratorySetting'
    | 'uploadFile',
) {
  return LaboratoryController.prototype[methodName];
}
