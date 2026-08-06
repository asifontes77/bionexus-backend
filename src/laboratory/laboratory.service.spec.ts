import { HttpException, HttpStatus } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Laboratory } from './laboratory.entity';
import { LaboratoryService } from './laboratory.service';

describe('LaboratoryService', () => {
  let service: LaboratoryService;
  let find: jest.Mock;
  let findOne: jest.Mock;
  let save: jest.Mock;

  function createLaboratory(): Laboratory {
    return {
      id: 1,
      name: 'Laboratorio TORO',
      business_name: 'Laboratorio TORO C.A.',
      rif: 'J-12345678-9',
      license: 'secret-license',
      sendEmail: {
        isGmail: true,
        user: 'mail@example.com',
        pass: 'secret-password',
        from: 'mail@example.com',
      },
    } as unknown as Laboratory;
  }

  beforeEach(() => {
    find = jest.fn();
    findOne = jest.fn();
    save = jest.fn();

    const repository = {
      find,
      findOne,
      save,
    } as unknown as Repository<Laboratory>;

    service = new LaboratoryService(repository);
  });

  it('mantiene los datos completos para uso interno', async () => {
    const laboratory = createLaboratory();
    findOne.mockResolvedValue(laboratory);

    const result = await service.getLaboratory(1);

    expect(result).toBe(laboratory);
    expect((result as Laboratory).license).toBe('secret-license');
    expect(
      ((result as Laboratory).sendEmail as unknown as { pass: string }).pass,
    ).toBe('secret-password');
  });

  it('devuelve not found cuando el laboratorio no existe', async () => {
    findOne.mockResolvedValue(null);

    const result = await service.getLaboratory(1);

    expect(result).toBeInstanceOf(HttpException);
    expect((result as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('retira la licencia y vacia la clave SMTP en la respuesta publica', async () => {
    const laboratory = createLaboratory();
    findOne.mockResolvedValue(laboratory);

    const result = await service.getPublicLaboratory(1);
    const publicLaboratory = result as unknown as {
      license?: string;
      sendEmail: {
        pass: string;
        user: string;
      };
    };

    expect(publicLaboratory.license).toBeUndefined();
    expect(publicLaboratory.sendEmail.pass).toBe('');
    expect(publicLaboratory.sendEmail.user).toBe('mail@example.com');
  });

  it('no modifica la entidad original al crear la respuesta publica', async () => {
    const laboratory = createLaboratory();
    findOne.mockResolvedValue(laboratory);

    await service.getPublicLaboratory(1);

    expect(laboratory.license).toBe('secret-license');
    expect((laboratory.sendEmail as unknown as { pass: string }).pass).toBe(
      'secret-password',
    );
  });

  it('protege cada elemento del listado publico', async () => {
    find.mockResolvedValue([createLaboratory()]);

    const result = await service.getPublicLaboratorySetting();
    const publicLaboratory = result[0] as unknown as {
      license?: string;
      sendEmail: {
        pass: string;
      };
    };

    expect(find).toHaveBeenCalledWith({ take: 1 });
    expect(publicLaboratory.license).toBeUndefined();
    expect(publicLaboratory.sendEmail.pass).toBe('');
  });

  it('conserva la clave SMTP cuando el cambio contiene una clave vacia', async () => {
    const laboratory = createLaboratory();

    findOne.mockResolvedValue(laboratory);
    save.mockImplementation(async (value) => value);

    const result = await service.updateLaboratory(1, {
      name: 'Laboratorio actualizado',
      sendEmail: {
        isGmail: true,
        user: 'new@example.com',
        pass: '',
        from: 'new@example.com',
      } as unknown as JSON,
    });

    const updatedLaboratory = result as Laboratory;
    const sendEmail = updatedLaboratory.sendEmail as unknown as {
      pass: string;
      user: string;
    };

    expect(sendEmail.pass).toBe('secret-password');
    expect(sendEmail.user).toBe('new@example.com');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reemplaza la clave SMTP cuando llega una clave nueva', async () => {
    const laboratory = createLaboratory();

    findOne.mockResolvedValue(laboratory);
    save.mockImplementation(async (value) => value);

    const result = await service.updateLaboratory(1, {
      sendEmail: {
        isGmail: true,
        user: 'new@example.com',
        pass: 'new-secret-password',
        from: 'new@example.com',
      } as unknown as JSON,
    });

    const updatedLaboratory = result as Laboratory;
    const sendEmail = updatedLaboratory.sendEmail as unknown as {
      pass: string;
    };

    expect(sendEmail.pass).toBe('new-secret-password');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
