import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Examlists } from '../exam_lists/examlists.entity';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { ExamTariffPricesService } from './exam-tariff-prices.service';
import { Tariff } from './tariff.entity';

describe('ExamTariffPricesService validation', () => {
  const service = new ExamTariffPricesService(
    {} as Repository<ExamTariffPrice>,
    {} as Repository<Tariff>,
    {} as Repository<Examlists>,
  );

  it('rechaza examen invalido', async () => {
    await expect(service.getByExam(0)).rejects.toThrow(
      new BadRequestException('EXAM_TARIFF_PRICE_EXAM_ID_INVALID'),
    );
  });

  it('rechaza reemplazo vacio antes de exigir transaccion', async () => {
    await expect(service.replace(1, { prices: [] }, 1)).rejects.toThrow(
      'EXAM_TARIFF_PRICE_VALUES_REQUIRED',
    );
  });

  it('rechaza tarifa duplicada', async () => {
    await expect(
      service.replace(
        1,
        {
          prices: [
            { tariffId: 1, price: 10 },
            { tariffId: 1, price: 20 },
          ],
        },
        1,
      ),
    ).rejects.toThrow('EXAM_TARIFF_PRICE_TARIFF_DUPLICATED');
  });

  it('rechaza precio negativo y estado invalido', async () => {
    await expect(
      service.replace(1, { prices: [{ tariffId: 1, price: -1 }] }, 1),
    ).rejects.toThrow('EXAM_TARIFF_PRICE_AMOUNT_INVALID');
    await expect(
      service.replace(
        1,
        { prices: [{ tariffId: 1, price: 1, isActive: 'yes' as never }] },
        1,
      ),
    ).rejects.toThrow('EXAM_TARIFF_PRICE_STATUS_INVALID');
  });
});
