import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TypePayment } from './typepayment.entity';
import { TypePaymentService } from './typepayment.service';

describe('TypePaymentService', () => {
  let find: jest.Mock;
  let findOne: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;
  let service: TypePaymentService;

  beforeEach(() => {
    find = jest.fn();
    findOne = jest.fn();
    create = jest.fn((value) => value);
    save = jest.fn(async (value) => value);
    service = new TypePaymentService({ find, findOne, create, save } as unknown as Repository<TypePayment>);
  });

  it('lista ordenado por descripcion', async () => {
    find.mockResolvedValue([]);
    await service.getTypepayments();
    expect(find).toHaveBeenCalledWith({ order: { description: 'ASC' } });
  });

  it('rechaza id invalido', async () => {
    await expect(service.getTypepayment(0)).rejects.toBeInstanceOf(BadRequestException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('rechaza registro inexistente', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.getTypepayment(8)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('normaliza create y fuerza estado activo', async () => {
    await service.createTypepayment({
      description: '  Tarjeta  ',
      description_1: ' Banco ',
      description_2: '  ',
      only_dollars: false,
    });
    expect(create).toHaveBeenCalledWith({
      description: 'Tarjeta',
      description_1: 'Banco',
      description_2: '',
      only_dollars: false,
      annulled: false,
    });
  });

  it('rechaza create sin descripcion', async () => {
    await expect(service.createTypepayment({ description: ' ' }))
      .rejects.toMatchObject({ response: { message: 'TYPEPAYMENT_DESCRIPTION_REQUIRED' } });
  });

  it('actualiza campos selectivos', async () => {
    const record = payment();
    findOne.mockResolvedValue(record);
    await service.updateTypepayment(1, { description_1: ' Referencia ', only_dollars: true });
    expect(record.description_1).toBe('Referencia');
    expect(record.only_dollars).toBe(true);
    expect(record.description).toBe('Efectivo');
  });

  it('rechaza payload vacio', async () => {
    await expect(service.updateTypepayment(1, {}))
      .rejects.toMatchObject({ response: { message: 'TYPEPAYMENT_UPDATE_REQUIRED' } });
  });

  it('rechaza booleanos invalidos', async () => {
    findOne.mockResolvedValue(payment());
    await expect(service.updateTypepayment(1, { annulled: 1 as unknown as boolean }))
      .rejects.toMatchObject({ response: { message: 'TYPEPAYMENT_ANNULLED_INVALID' } });
  });

  function payment(): TypePayment {
    return {
      id: 1,
      description: 'Efectivo',
      description_1: '',
      description_2: '',
      annulled: false,
      only_dollars: false,
    };
  }
});
