import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Parasiticforms } from './parasiticforms.entity';
import { ParasiticformsService } from './parasiticforms.service';

describe('ParasiticformsService', () => {
  let service: ParasiticformsService;
  let find: jest.Mock;
  let findOne: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;

  beforeEach(() => {
    find = jest.fn();
    findOne = jest.fn();
    create = jest.fn();
    save = jest.fn();

    const repository = {
      find,
      findOne,
      create,
      save,
    } as unknown as Repository<Parasiticforms>;

    service = new ParasiticformsService(repository);
  });

  describe('getParasiticformsLists', () => {
    it('devuelve el listado administrativo ordenado por descripcion', async () => {
      const records = [
        parasiticform(1, 'Áscaris', false),
        parasiticform(2, 'Ameba', true),
      ];

      find.mockResolvedValue(records);

      await expect(service.getParasiticformsLists()).resolves.toBe(records);

      expect(find).toHaveBeenCalledWith({
        order: {
          description: 'ASC',
        },
      });
    });
  });

  describe('getParasiticformsListsOrder', () => {
    it('devuelve solamente registros visibles ordenados por descripcion', async () => {
      const records = [parasiticform(1, 'Áscaris', false)];

      find.mockResolvedValue(records);

      await expect(service.getParasiticformsListsOrder()).resolves.toBe(
        records,
      );

      expect(find).toHaveBeenCalledWith({
        where: {
          annulled: false,
        },
        order: {
          description: 'ASC',
        },
      });
    });
  });

  describe('getParasiticforms', () => {
    it('rechaza identificadores invalidos antes de consultar el repositorio', async () => {
      await expect(service.getParasiticforms(0)).rejects.toThrow(
        new BadRequestException('PARASITICFORM_ID_INVALID'),
      );

      expect(findOne).not.toHaveBeenCalled();
    });

    it('lanza not found cuando el registro no existe', async () => {
      findOne.mockResolvedValue(null);

      await expect(service.getParasiticforms(7)).rejects.toThrow(
        new NotFoundException('PARASITICFORM_NOT_FOUND'),
      );

      expect(findOne).toHaveBeenCalledWith({
        where: {
          id: 7,
        },
      });
    });

    it('devuelve el registro encontrado', async () => {
      const record = parasiticform(7, 'Giardia', false);

      findOne.mockResolvedValue(record);

      await expect(service.getParasiticforms(7)).resolves.toBe(record);
    });
  });

  describe('createParasiticforms', () => {
    it('normaliza la descripcion y crea el registro visible', async () => {
      const createdRecord = parasiticform(0, 'Giardia', false);

      const savedRecord = parasiticform(9, 'Giardia', false);

      create.mockReturnValue(createdRecord);
      save.mockResolvedValue(savedRecord);

      await expect(
        service.createParasiticforms({
          description: '  Giardia  ',
        }),
      ).resolves.toBe(savedRecord);

      expect(create).toHaveBeenCalledWith({
        description: 'Giardia',
        annulled: false,
      });

      expect(save).toHaveBeenCalledWith(createdRecord);
    });

    it.each([[undefined], [''], ['   ']])(
      'rechaza una descripcion obligatoria invalida',
      async (description) => {
        await expect(
          service.createParasiticforms({
            description,
          } as unknown as {
            description: string;
          }),
        ).rejects.toThrow(
          new BadRequestException('PARASITICFORM_DESCRIPTION_REQUIRED'),
        );

        expect(create).not.toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
      },
    );

    it('rechaza descripciones mayores de 50 caracteres', async () => {
      await expect(
        service.createParasiticforms({
          description: 'A'.repeat(51),
        }),
      ).rejects.toThrow(
        new BadRequestException('PARASITICFORM_DESCRIPTION_TOO_LONG'),
      );

      expect(create).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('updateParasiticforms', () => {
    it('rechaza un payload sin cambios antes de consultar el repositorio', async () => {
      await expect(service.updateParasiticforms(1, {})).rejects.toThrow(
        new BadRequestException('PARASITICFORM_UPDATE_REQUIRED'),
      );

      expect(findOne).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('normaliza y actualiza solamente la descripcion', async () => {
      const record = parasiticform(1, 'Anterior', false);

      findOne.mockResolvedValue(record);
      save.mockImplementation(async (value) => value);

      const result = await service.updateParasiticforms(1, {
        description: '  Blastocystis  ',
      });

      expect(result).toBe(record);
      expect(record).toEqual({
        id: 1,
        description: 'Blastocystis',
        annulled: false,
      });

      expect(save).toHaveBeenCalledWith(record);
    });

    it('actualiza solamente el estado annulled', async () => {
      const record = parasiticform(1, 'Blastocystis', false);

      findOne.mockResolvedValue(record);
      save.mockImplementation(async (value) => value);

      const result = await service.updateParasiticforms(1, {
        annulled: true,
      });

      expect(result).toBe(record);
      expect(record.annulled).toBe(true);
      expect(record.description).toBe('Blastocystis');

      expect(save).toHaveBeenCalledWith(record);
    });

    it('actualiza descripcion y estado en una sola operacion', async () => {
      const record = parasiticform(1, 'Anterior', false);

      findOne.mockResolvedValue(record);
      save.mockImplementation(async (value) => value);

      await service.updateParasiticforms(1, {
        description: '  Nueva forma  ',
        annulled: true,
      });

      expect(record).toEqual({
        id: 1,
        description: 'Nueva forma',
        annulled: true,
      });

      expect(save).toHaveBeenCalledTimes(1);
    });

    it('rechaza un estado annulled que no sea booleano', async () => {
      const record = parasiticform(1, 'Blastocystis', false);

      findOne.mockResolvedValue(record);

      await expect(
        service.updateParasiticforms(1, {
          annulled: 1,
        } as unknown as {
          annulled: boolean;
        }),
      ).rejects.toThrow(
        new BadRequestException('PARASITICFORM_ANNULLED_INVALID'),
      );

      expect(save).not.toHaveBeenCalled();
    });

    it('rechaza una descripcion vacia sin guardar cambios', async () => {
      const record = parasiticform(1, 'Blastocystis', false);

      findOne.mockResolvedValue(record);

      await expect(
        service.updateParasiticforms(1, {
          description: '   ',
        }),
      ).rejects.toThrow(
        new BadRequestException('PARASITICFORM_DESCRIPTION_REQUIRED'),
      );

      expect(save).not.toHaveBeenCalled();
    });

    it('rechaza una descripcion mayor de 50 caracteres', async () => {
      const record = parasiticform(1, 'Blastocystis', false);

      findOne.mockResolvedValue(record);

      await expect(
        service.updateParasiticforms(1, {
          description: 'A'.repeat(51),
        }),
      ).rejects.toThrow(
        new BadRequestException('PARASITICFORM_DESCRIPTION_TOO_LONG'),
      );

      expect(save).not.toHaveBeenCalled();
    });

    it('lanza not found cuando el registro a actualizar no existe', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        service.updateParasiticforms(44, {
          description: 'Giardia',
        }),
      ).rejects.toThrow(new NotFoundException('PARASITICFORM_NOT_FOUND'));

      expect(save).not.toHaveBeenCalled();
    });
  });

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
