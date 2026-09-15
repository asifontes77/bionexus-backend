import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { Examlists } from '../exam_lists/examlists.entity';
import {
  ExamTariffPriceInputDto,
  ReplaceExamTariffPricesDto,
} from './dto/replace-exam-tariff-prices.dto';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { Tariff } from './tariff.entity';

@Injectable()
export class ExamTariffPricesService {
  constructor(
    @InjectRepository(ExamTariffPrice)
    private readonly priceRepository: Repository<ExamTariffPrice>,
    @InjectRepository(Tariff)
    private readonly tariffRepository: Repository<Tariff>,
    @InjectRepository(Examlists)
    private readonly examRepository: Repository<Examlists>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  async getByExam(examCatalogId: number) {
    this.validateId(examCatalogId, 'EXAM_TARIFF_PRICE_EXAM_ID_INVALID');
    const exam = await this.examRepository.findOne({
      where: { id: examCatalogId },
    });
    if (!exam) throw new NotFoundException('EXAM_TARIFF_PRICE_EXAM_NOT_FOUND');
    const tariffs = await this.tariffRepository.find({
      order: { position: 'ASC', id: 'ASC' },
    });
    const prices = await this.priceRepository.find({
      where: { examCatalogId },
      order: { tariffId: 'ASC' },
    });
    const byTariff = new Map(prices.map((price) => [price.tariffId, price]));
    return {
      examCatalogId,
      examDescription: exam.description,
      prices: tariffs.map((tariff) => ({
        tariffId: tariff.id,
        tariffCode: tariff.code,
        tariffName: tariff.name,
        currencyCode: tariff.currency?.code ?? '',
        tariffActive: Boolean(tariff.isActive),
        price: Number(byTariff.get(tariff.id)?.price ?? 0),
        isActive: Boolean(byTariff.get(tariff.id)?.isActive ?? true),
      })),
    };
  }

  async replace(
    examCatalogId: number,
    body: ReplaceExamTariffPricesDto,
    actorUserId?: number,
  ) {
    this.validateId(examCatalogId, 'EXAM_TARIFF_PRICE_EXAM_ID_INVALID');
    const values = this.normalize(body);
    if (!Number.isInteger(actorUserId) || Number(actorUserId) <= 0)
      throw new BadRequestException('EXAM_TARIFF_PRICE_ACTOR_REQUIRED');
    if (!this.dataSource)
      throw new Error('EXAM_TARIFF_PRICE_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) =>
      this.replaceInTransaction(
        manager,
        examCatalogId,
        values,
        Number(actorUserId),
      ),
    );
  }

  private async replaceInTransaction(
    manager: EntityManager,
    examCatalogId: number,
    values: ExamTariffPriceInputDto[],
    actorUserId: number,
  ) {
    const examRepository = manager.getRepository(Examlists);
    const tariffRepository = manager.getRepository(Tariff);
    const priceRepository = manager.getRepository(ExamTariffPrice);
    const exam = await examRepository
      .createQueryBuilder('exam')
      .setLock('pessimistic_write')
      .where('exam.id = :examCatalogId', { examCatalogId })
      .getOne();
    if (!exam) throw new NotFoundException('EXAM_TARIFF_PRICE_EXAM_NOT_FOUND');

    const tariffIds = values.map((value) => value.tariffId);
    const tariffs = await tariffRepository.find({
      where: { id: In(tariffIds) },
      order: { id: 'ASC' },
    });
    if (tariffs.length !== tariffIds.length)
      throw new NotFoundException('EXAM_TARIFF_PRICE_TARIFF_NOT_FOUND');
    const tariffById = new Map(tariffs.map((tariff) => [tariff.id, tariff]));

    const existing = await priceRepository.find({ where: { examCatalogId } });
    const existingByTariff = new Map(
      existing.map((price) => [price.tariffId, price]),
    );
    const previous = existing.map((price) => ({
      tariffId: price.tariffId,
      price: Number(price.price),
      isActive: price.isActive,
    }));
    const saved: ExamTariffPrice[] = [];

    for (const value of values) {
      const current =
        existingByTariff.get(value.tariffId) ??
        priceRepository.create({ examCatalogId, tariffId: value.tariffId });
      current.price = value.price;
      current.isActive = value.isActive ?? true;
      saved.push(await priceRepository.save(current));
    }

    this.syncLegacyPrices(exam, values, tariffById);
    await examRepository.save(exam);
    if (!this.audit) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    await this.audit.write(manager, {
      actorUserId,
      action: 'exam-tariff-prices.replaced',
      entityType: 'exam_catalog',
      entityId: examCatalogId,
      summary: 'Precios por tarifa actualizados',
      metadata: {
        currencyCode: 'USD',
        previous,
        current: saved.map((price) => ({
          tariffId: price.tariffId,
          price: Number(price.price),
          isActive: price.isActive,
        })),
        compatibility: 'legacy-cost1-cost6-synchronized',
      },
    });
    return this.getByExamWith(manager, exam);
  }

  private async getByExamWith(manager: EntityManager, exam: Examlists) {
    const tariffs = await manager
      .getRepository(Tariff)
      .find({ order: { position: 'ASC', id: 'ASC' } });
    const prices = await manager
      .getRepository(ExamTariffPrice)
      .find({ where: { examCatalogId: exam.id }, order: { tariffId: 'ASC' } });
    const byTariff = new Map(prices.map((price) => [price.tariffId, price]));
    return {
      examCatalogId: exam.id,
      examDescription: exam.description,
      prices: tariffs.map((tariff) => ({
        tariffId: tariff.id,
        tariffCode: tariff.code,
        tariffName: tariff.name,
        currencyCode: tariff.currency?.code ?? '',
        tariffActive: Boolean(tariff.isActive),
        price: Number(byTariff.get(tariff.id)?.price ?? 0),
        isActive: Boolean(byTariff.get(tariff.id)?.isActive ?? true),
      })),
    };
  }

  private normalize(
    body: ReplaceExamTariffPricesDto,
  ): ExamTariffPriceInputDto[] {
    if (
      !body ||
      typeof body !== 'object' ||
      !Array.isArray(body.prices) ||
      body.prices.length === 0
    )
      throw new BadRequestException('EXAM_TARIFF_PRICE_VALUES_REQUIRED');
    if (body.prices.length > 500)
      throw new BadRequestException('EXAM_TARIFF_PRICE_VALUES_TOO_MANY');
    const values = body.prices.map((item) => {
      if (!item || typeof item !== 'object')
        throw new BadRequestException('EXAM_TARIFF_PRICE_VALUE_INVALID');
      const tariffId = Number(item.tariffId);
      const price = Number(item.price);
      if (!Number.isInteger(tariffId) || tariffId <= 0)
        throw new BadRequestException('EXAM_TARIFF_PRICE_TARIFF_ID_INVALID');
      if (!Number.isFinite(price) || price < 0 || price > 9999999999999999.99)
        throw new BadRequestException('EXAM_TARIFF_PRICE_AMOUNT_INVALID');
      if (item.isActive !== undefined && typeof item.isActive !== 'boolean')
        throw new BadRequestException('EXAM_TARIFF_PRICE_STATUS_INVALID');
      return {
        tariffId,
        price: Math.round(price * 100) / 100,
        isActive: item.isActive,
      };
    });
    if (new Set(values.map((value) => value.tariffId)).size !== values.length)
      throw new BadRequestException('EXAM_TARIFF_PRICE_TARIFF_DUPLICATED');
    return values;
  }

  private syncLegacyPrices(
    exam: Examlists,
    values: ExamTariffPriceInputDto[],
    tariffById: Map<number, Tariff>,
  ): void {
    for (const value of values) {
      const code = tariffById.get(value.tariffId)?.code;
      const match = /^LEGACY_([1-6])$/.exec(code ?? '');
      if (!match) continue;
      const field = `cost${match[1]}` as
        'cost1' | 'cost2' | 'cost3' | 'cost4' | 'cost5' | 'cost6';
      exam[field] = value.price;
    }
  }

  private validateId(value: number, code: string): void {
    if (!Number.isInteger(value) || value <= 0)
      throw new BadRequestException(code);
  }
}
