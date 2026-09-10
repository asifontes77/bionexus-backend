import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { Tariff } from './tariff.entity';
import { TariffsService } from './tariffs.service';

describe('TariffsService critical rules', () => {
  const tariffRepository = {} as Repository<Tariff>;
  const priceRepository = {} as Repository<ExamTariffPrice>;
  const audit = { write: jest.fn() };
  let manager: { getRepository: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let service: TariffsService;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = { getRepository: jest.fn() };
    dataSource = { transaction: jest.fn(async (action) => action(manager)) };
    audit.write.mockResolvedValue(undefined);
    service = new TariffsService(
      tariffRepository,
      priceRepository,
      dataSource as unknown as DataSource,
      audit as unknown as SecurityAuditService,
    );
  });

  it('rechaza escrituras sin actor autenticado', async () => {
    await expect(
      service.create({ code: 'PARTICULAR', name: 'Particular' }, undefined),
    ).rejects.toThrow(new BadRequestException('TARIFF_ACTOR_REQUIRED'));
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('impide inactivar la tarifa predeterminada', async () => {
    const repository = lockedRepository(row({ id: 1, isDefault: true }));
    manager.getRepository.mockReturnValue(repository);
    await expect(
      service.changeStatus(1, { isActive: false }, 7),
    ).rejects.toThrow(
      new ConflictException('TARIFF_DEFAULT_CANNOT_BE_DEACTIVATED'),
    );
  });

  it('impide inactivar la ultima tarifa activa', async () => {
    const repository = lockedRepository(row({ id: 2 }));
    repository.count.mockResolvedValue(1);
    manager.getRepository.mockReturnValue(repository);
    await expect(
      service.changeStatus(2, { isActive: false }, 7),
    ).rejects.toThrow(
      new ConflictException('TARIFF_LAST_ACTIVE_CANNOT_BE_DEACTIVATED'),
    );
  });

  it('rechaza una tarifa inactiva como predeterminada', async () => {
    const repository = listRepository([
      row({ id: 1, isDefault: true }),
      row({ id: 2, isActive: false }),
    ]);
    manager.getRepository.mockReturnValue(repository);
    await expect(service.setDefault(2, 9)).rejects.toThrow(
      new ConflictException('TARIFF_DEFAULT_MUST_BE_ACTIVE'),
    );
  });

  it('cambia la predeterminada y audita la anterior', async () => {
    const first = row({ id: 1, isDefault: true });
    const second = row({ id: 2 });
    const repository = listRepository([first, second]);
    repository.save.mockImplementation(async (values) => values);
    manager.getRepository.mockReturnValue(repository);
    await expect(service.setDefault(2, 9)).resolves.toMatchObject({ id: 2 });
    expect(first.isDefault).toBe(false);
    expect(second.isDefault).toBe(true);
    expect(audit.write).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: 'tariff.default-set',
        metadata: expect.objectContaining({ previousDefaultId: 1 }),
      }),
    );
  });

  it('valida codigo, nombre, posicion y campos desconocidos', async () => {
    await expect(
      service.create({ code: 'x', name: 'Valida' }, 1),
    ).rejects.toThrow('TARIFF_CODE_INVALID');
    await expect(
      service.create({ code: 'VALIDA', name: ' ' }, 1),
    ).rejects.toThrow('TARIFF_NAME_REQUIRED');
    await expect(service.update(1, { position: 0 }, 1)).rejects.toThrow(
      'TARIFF_POSITION_INVALID',
    );
    await expect(
      service.update(1, { unknown: true } as never, 1),
    ).rejects.toThrow('TARIFF_FIELD_UNKNOWN');
  });

  function row(values: Partial<Tariff>): Tariff {
    return {
      id: 1,
      code: 'LEGACY_1',
      name: 'Tarifa 1',
      description: null,
      currencyCode: 'USD',
      position: 1,
      isDefault: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      prices: [],
      ...values,
    };
  }

  function lockedRepository(value: Tariff) {
    const builder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(value),
    };
    return {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
      count: jest.fn(),
      save: jest.fn(),
    };
  }

  function listRepository(values: Tariff[]) {
    const builder = {
      setLock: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(values),
    };
    return {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
      save: jest.fn(),
    };
  }
});
