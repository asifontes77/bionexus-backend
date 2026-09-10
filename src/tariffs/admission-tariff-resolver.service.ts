import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Client } from '../client/client.entity';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { Tariff } from './tariff.entity';

@Injectable()
export class AdmissionTariffResolverService {
  private static readonly AMBULATORY_CLIENT_ID = 1;

  constructor(
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(Tariff) private readonly tariffRepository: Repository<Tariff>,
    @InjectRepository(ExamTariffPrice) private readonly priceRepository: Repository<ExamTariffPrice>,
  ) {}

  async resolve(clientId: number, tariffId?: number, examCatalogIds: number[] = []) {
    if (!Number.isInteger(clientId) || clientId <= 0) throw new BadRequestException('ADMISSION_TARIFF_CLIENT_ID_INVALID');
    const tariff = tariffId === undefined
      ? (clientId === AdmissionTariffResolverService.AMBULATORY_CLIENT_ID ? await this.getSingleDefaultTariff() : await this.getClientTariff(clientId))
      : await this.getExplicitTariff(tariffId);
    const ids = this.normalizeExamIds(examCatalogIds);
    const prices = ids.length === 0 ? [] : await this.priceRepository.find({ where: { tariffId: tariff.id, examCatalogId: In(ids), isActive: true } });
    if (prices.length !== ids.length) throw new NotFoundException('ADMISSION_TARIFF_EXAM_PRICE_NOT_FOUND');
    const byExam = new Map(prices.map(price => [price.examCatalogId, Number(price.price)]));
    return {
      clientId,
      ambulatory: clientId === AdmissionTariffResolverService.AMBULATORY_CLIENT_ID,
      tariff: { id: tariff.id, code: tariff.code, name: tariff.name, currencyCode: tariff.currencyCode },
      prices: ids.map(examCatalogId => ({ examCatalogId, price: byExam.get(examCatalogId) as number })),
    };
  }

  private async getSingleDefaultTariff(): Promise<Tariff> {
    const defaults = await this.tariffRepository.find({ where: { isDefault: true, isActive: true }, order: { id: 'ASC' }, take: 2 });
    if (defaults.length === 0) throw new NotFoundException('ADMISSION_TARIFF_DEFAULT_NOT_FOUND');
    if (defaults.length > 1) throw new BadRequestException('ADMISSION_TARIFF_DEFAULT_AMBIGUOUS');
    return defaults[0];
  }

  private async getExplicitTariff(tariffId: number): Promise<Tariff> {
    if (!Number.isInteger(tariffId) || tariffId <= 0) throw new BadRequestException('ADMISSION_TARIFF_ID_INVALID');
    const tariff = await this.tariffRepository.findOne({ where: { id: tariffId, isActive: true } });
    if (!tariff) throw new NotFoundException('ADMISSION_TARIFF_INACTIVE_OR_NOT_FOUND');
    return tariff;
  }

  private async getClientTariff(clientId: number): Promise<Tariff> {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('ADMISSION_TARIFF_CLIENT_NOT_FOUND');
    if (!Number.isInteger(Number(client.tariff_id)) || Number(client.tariff_id) <= 0) throw new NotFoundException('ADMISSION_TARIFF_CLIENT_TARIFF_NOT_FOUND');
    const tariff = await this.tariffRepository.findOne({ where: { id: Number(client.tariff_id), isActive: true } });
    if (!tariff) throw new NotFoundException('ADMISSION_TARIFF_INACTIVE_OR_NOT_FOUND');
    return tariff;
  }

  private normalizeExamIds(values: number[]): number[] {
    if (!Array.isArray(values)) throw new BadRequestException('ADMISSION_TARIFF_EXAM_IDS_INVALID');
    const ids = values.map(Number);
    if (ids.some(id => !Number.isInteger(id) || id <= 0)) throw new BadRequestException('ADMISSION_TARIFF_EXAM_ID_INVALID');
    if (new Set(ids).size !== ids.length) throw new BadRequestException('ADMISSION_TARIFF_EXAM_ID_DUPLICATED');
    if (ids.length > 500) throw new BadRequestException('ADMISSION_TARIFF_EXAM_IDS_TOO_MANY');
    return ids;
  }
}
