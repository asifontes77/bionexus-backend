import { Repository } from 'typeorm';
import { Client } from '../client/client.entity';
import { AdmissionTariffResolverService } from './admission-tariff-resolver.service';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { Tariff } from './tariff.entity';

describe('AdmissionTariffResolverService', () => {
  const clientRepository = { findOne: jest.fn() } as unknown as Repository<Client>;
  const tariffRepository = { find: jest.fn(), findOne: jest.fn() } as unknown as Repository<Tariff>;
  const priceRepository = { find: jest.fn() } as unknown as Repository<ExamTariffPrice>;
  const service = new AdmissionTariffResolverService(clientRepository, tariffRepository, priceRepository);

  beforeEach(() => jest.clearAllMocks());

  it('usa la tarifa predeterminada activa para Ambulatorio reservado', async () => {
    (tariffRepository.find as jest.Mock).mockResolvedValue([{ id: 9, code: 'PUBLIC', name: 'Publica', currencyCode: 'USD' }]);
    await expect(service.resolve(1, undefined)).resolves.toMatchObject({ clientId: 1, ambulatory: true, tariff: { id: 9 } });
    expect(clientRepository.findOne).not.toHaveBeenCalled();
  });

  it('usa tariff_id del referido y precios normalizados activos', async () => {
    (clientRepository.findOne as jest.Mock).mockResolvedValue({ id: 3, tariff_id: 7 });
    (tariffRepository.findOne as jest.Mock).mockResolvedValue({ id: 7, code: 'CORP', name: 'Corporativa', currencyCode: 'USD' });
    (priceRepository.find as jest.Mock).mockResolvedValue([{ examCatalogId: 10, tariffId: 7, price: 12.5, isActive: true }]);
    await expect(service.resolve(3, undefined, [10])).resolves.toMatchObject({ tariff: { id: 7 }, prices: [{ examCatalogId: 10, price: 12.5 }] });
  });

  it('permite una tarifa activa explicita independiente del referido', async () => {
    (tariffRepository.findOne as jest.Mock).mockResolvedValue({ id: 8, code: 'ESPECIAL', name: 'Especial', currencyCode: 'USD', isActive: true });
    (priceRepository.find as jest.Mock).mockResolvedValue([{ examCatalogId: 10, tariffId: 8, price: 22, isActive: true }]);
    await expect(service.resolve(3, 8, [10])).resolves.toMatchObject({ tariff: { id: 8 }, prices: [{ examCatalogId: 10, price: 22 }] });
    expect(clientRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza ambiguedad y precio ausente', async () => {
    (tariffRepository.find as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await expect(service.resolve(1, undefined)).rejects.toThrow('ADMISSION_TARIFF_DEFAULT_AMBIGUOUS');
    (clientRepository.findOne as jest.Mock).mockResolvedValue({ id: 3, tariff_id: 7 });
    (tariffRepository.findOne as jest.Mock).mockResolvedValue({ id: 7, isActive: true });
    (priceRepository.find as jest.Mock).mockResolvedValue([]);
    await expect(service.resolve(3, undefined, [10])).rejects.toThrow('ADMISSION_TARIFF_EXAM_PRICE_NOT_FOUND');
  });
});
