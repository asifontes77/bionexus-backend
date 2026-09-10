import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { ChangeTariffStatusDto } from './dto/change-tariff-status.dto';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { Tariff } from './tariff.entity';

type TariffWriteAction =
  | 'tariff.created'
  | 'tariff.updated'
  | 'tariff.activated'
  | 'tariff.deactivated'
  | 'tariff.default-set';

@Injectable()
export class TariffsService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffRepository: Repository<Tariff>,
    @InjectRepository(ExamTariffPrice)
    private readonly priceRepository: Repository<ExamTariffPrice>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  async getAll() {
    const tariffs = await this.tariffRepository.find({
      order: { position: 'ASC', id: 'ASC' },
    });
    const counts = await this.priceRepository
      .createQueryBuilder('price')
      .select('price.tariffId', 'tariffId')
      .addSelect('COUNT(*)', 'configuredPriceCount')
      .groupBy('price.tariffId')
      .getRawMany<{
        tariffId: string | number;
        configuredPriceCount: string | number;
      }>();
    const byTariff = new Map(
      counts.map((row) => [
        Number(row.tariffId),
        Number(row.configuredPriceCount),
      ]),
    );
    return tariffs.map((tariff) => ({
      ...tariff,
      configuredPriceCount: byTariff.get(tariff.id) ?? 0,
    }));
  }

  getActive(): Promise<Tariff[]> {
    return this.tariffRepository.find({
      where: { isActive: true },
      order: { position: 'ASC', id: 'ASC' },
    });
  }

  async getOne(id: number): Promise<Tariff & { configuredPriceCount: number }> {
    this.validateId(id);
    const tariff = await this.tariffRepository.findOne({ where: { id } });
    if (!tariff) throw new NotFoundException('TARIFF_NOT_FOUND');
    const configuredPriceCount = await this.priceRepository.count({
      where: { tariffId: id },
    });
    return { ...tariff, configuredPriceCount };
  }

  async create(body: CreateTariffDto, actorUserId?: number): Promise<Tariff> {
    const values = this.normalizeCreate(body);
    return this.runWrite(actorUserId, async (manager) => {
      const repository = manager.getRepository(Tariff);
      await this.assertUnique(
        repository,
        values.code as string,
        values.name as string,
      );
      const position = values.position ?? (await this.nextPosition(repository));
      await this.assertPositionAvailable(repository, position);
      const saved = await repository.save(
        repository.create({
          ...values,
          position,
          currencyCode: 'USD',
          isDefault: false,
          isActive: true,
        }),
      );
      await this.writeAudit(
        manager,
        actorUserId,
        'tariff.created',
        saved,
        values,
      );
      return saved;
    });
  }

  async update(
    id: number,
    body: UpdateTariffDto,
    actorUserId?: number,
  ): Promise<Tariff> {
    this.validateId(id);
    const values = this.normalizeUpdate(body);
    return this.runWrite(actorUserId, async (manager) => {
      const repository = manager.getRepository(Tariff);
      const tariff = await repository
        .createQueryBuilder('tariff')
        .setLock('pessimistic_write')
        .where('tariff.id = :id', { id })
        .getOne();
      if (!tariff) throw new NotFoundException('TARIFF_NOT_FOUND');
      await this.assertUnique(
        repository,
        values.code ?? tariff.code,
        values.name ?? tariff.name,
        id,
      );
      if (values.position !== undefined && values.position !== tariff.position)
        await this.assertPositionAvailable(repository, values.position, id);
      const saved = await repository.save(Object.assign(tariff, values));
      await this.writeAudit(
        manager,
        actorUserId,
        'tariff.updated',
        saved,
        values,
      );
      return saved;
    });
  }

  async changeStatus(
    id: number,
    body: ChangeTariffStatusDto,
    actorUserId?: number,
  ): Promise<Tariff> {
    this.validateId(id);
    if (!body || typeof body !== 'object' || typeof body.isActive !== 'boolean')
      throw new BadRequestException('TARIFF_STATUS_INVALID');
    return this.runWrite(actorUserId, async (manager) => {
      const repository = manager.getRepository(Tariff);
      const tariff = await repository
        .createQueryBuilder('tariff')
        .setLock('pessimistic_write')
        .where('tariff.id = :id', { id })
        .getOne();
      if (!tariff) throw new NotFoundException('TARIFF_NOT_FOUND');
      if (tariff.isActive === body.isActive) return tariff;
      if (!body.isActive) {
        if (tariff.isDefault)
          throw new ConflictException('TARIFF_DEFAULT_CANNOT_BE_DEACTIVATED');
        const activeCount = await repository.count({
          where: { isActive: true },
        });
        if (activeCount <= 1)
          throw new ConflictException(
            'TARIFF_LAST_ACTIVE_CANNOT_BE_DEACTIVATED',
          );
      }
      tariff.isActive = body.isActive;
      const saved = await repository.save(tariff);
      await this.writeAudit(
        manager,
        actorUserId,
        body.isActive ? 'tariff.activated' : 'tariff.deactivated',
        saved,
        { isActive: body.isActive },
      );
      return saved;
    });
  }

  async setDefault(id: number, actorUserId?: number): Promise<Tariff> {
    this.validateId(id);
    return this.runWrite(actorUserId, async (manager) => {
      const repository = manager.getRepository(Tariff);
      const tariffs = await repository
        .createQueryBuilder('tariff')
        .setLock('pessimistic_write')
        .orderBy('tariff.id', 'ASC')
        .getMany();
      const selected = tariffs.find((tariff) => tariff.id === id);
      if (!selected) throw new NotFoundException('TARIFF_NOT_FOUND');
      if (!selected.isActive)
        throw new ConflictException('TARIFF_DEFAULT_MUST_BE_ACTIVE');
      const previousDefaultId =
        tariffs.find((tariff) => tariff.isDefault)?.id ?? null;
      for (const tariff of tariffs) tariff.isDefault = tariff.id === id;
      await repository.save(tariffs);
      await this.writeAudit(
        manager,
        actorUserId,
        'tariff.default-set',
        selected,
        { previousDefaultId },
      );
      return selected;
    });
  }

  private async runWrite<T>(
    actorUserId: number | undefined,
    action: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (!Number.isInteger(actorUserId) || Number(actorUserId) <= 0)
      throw new BadRequestException('TARIFF_ACTOR_REQUIRED');
    if (!this.dataSource) throw new Error('TARIFF_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(action);
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: number | undefined,
    action: TariffWriteAction,
    tariff: Tariff,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (!this.audit) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    await this.audit.write(manager, {
      actorUserId: Number(actorUserId),
      action,
      entityType: 'tariff',
      entityId: tariff.id,
      summary:
        action === 'tariff.created'
          ? 'Tarifa creada'
          : action === 'tariff.default-set'
            ? 'Tarifa predeterminada actualizada'
            : action === 'tariff.activated'
              ? 'Tarifa activada'
              : action === 'tariff.deactivated'
                ? 'Tarifa inactivada'
                : 'Tarifa actualizada',
      metadata: {
        code: tariff.code,
        name: tariff.name,
        currencyCode: tariff.currencyCode,
        ...metadata,
      },
    });
  }

  private normalizeCreate(body: CreateTariffDto): Partial<Tariff> {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('TARIFF_BODY_REQUIRED');
    const allowed = ['code', 'name', 'description', 'position'];
    if (Object.keys(body).some((field) => !allowed.includes(field)))
      throw new BadRequestException('TARIFF_FIELD_UNKNOWN');
    return {
      code: this.normalizeCode(body.code),
      name: this.normalizeName(body.name),
      description: this.normalizeDescription(body.description),
      position:
        body.position === undefined
          ? undefined
          : this.normalizePosition(body.position),
    };
  }

  private normalizeUpdate(body: UpdateTariffDto): Partial<Tariff> {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    )
      throw new BadRequestException('TARIFF_UPDATE_REQUIRED');
    const allowed = ['code', 'name', 'description', 'position'];
    if (Object.keys(body).some((field) => !allowed.includes(field)))
      throw new BadRequestException('TARIFF_FIELD_UNKNOWN');
    const values: Partial<Tariff> = {};
    if (Object.prototype.hasOwnProperty.call(body, 'code'))
      values.code = this.normalizeCode(body.code);
    if (Object.prototype.hasOwnProperty.call(body, 'name'))
      values.name = this.normalizeName(body.name);
    if (Object.prototype.hasOwnProperty.call(body, 'description'))
      values.description = this.normalizeDescription(body.description);
    if (Object.prototype.hasOwnProperty.call(body, 'position'))
      values.position = this.normalizePosition(body.position);
    return values;
  }

  private normalizeCode(value: unknown): string {
    if (typeof value !== 'string')
      throw new BadRequestException('TARIFF_CODE_REQUIRED');
    const code = value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,59}$/.test(code))
      throw new BadRequestException('TARIFF_CODE_INVALID');
    return code;
  }

  private normalizeName(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '')
      throw new BadRequestException('TARIFF_NAME_REQUIRED');
    const name = value.trim();
    if (name.length > 100)
      throw new BadRequestException('TARIFF_NAME_TOO_LONG');
    return name;
  }

  private normalizeDescription(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string')
      throw new BadRequestException('TARIFF_DESCRIPTION_INVALID');
    const description = value.trim();
    if (description.length > 250)
      throw new BadRequestException('TARIFF_DESCRIPTION_TOO_LONG');
    return description === '' ? null : description;
  }

  private normalizePosition(value: unknown): number {
    const position = Number(value);
    if (!Number.isInteger(position) || position <= 0)
      throw new BadRequestException('TARIFF_POSITION_INVALID');
    return position;
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0)
      throw new BadRequestException('TARIFF_ID_INVALID');
  }

  private async nextPosition(repository: Repository<Tariff>): Promise<number> {
    const row = await repository
      .createQueryBuilder('tariff')
      .select('COALESCE(MAX(tariff.position),0)', 'position')
      .getRawOne<{ position: string | number }>();
    return Number(row?.position ?? 0) + 1;
  }

  private async assertUnique(
    repository: Repository<Tariff>,
    code: string,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const query = repository
      .createQueryBuilder('tariff')
      .where('(UPPER(tariff.code) = :code OR UPPER(tariff.name) = :name)', {
        code: code.toUpperCase(),
        name: name.toUpperCase(),
      });
    if (excludeId) query.andWhere('tariff.id <> :excludeId', { excludeId });
    if (await query.getOne())
      throw new ConflictException('TARIFF_CODE_OR_NAME_ALREADY_EXISTS');
  }

  private async assertPositionAvailable(
    repository: Repository<Tariff>,
    position: number,
    excludeId?: number,
  ): Promise<void> {
    const query = repository
      .createQueryBuilder('tariff')
      .where('tariff.position = :position', { position });
    if (excludeId) query.andWhere('tariff.id <> :excludeId', { excludeId });
    if (await query.getOne())
      throw new ConflictException('TARIFF_POSITION_ALREADY_EXISTS');
  }
}
