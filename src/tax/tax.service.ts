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
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { Tax } from './tax.entity';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(Tax) private readonly taxRepository: Repository<Tax>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  getTaxes(): Promise<Tax[]> {
    return this.taxRepository.find({ order: { description: 'ASC' } });
  }

  async getTax(id: number): Promise<Tax> {
    this.validateId(id);
    const tax = await this.taxRepository.findOne({ where: { id } });
    if (!tax) throw new NotFoundException('TAX_NOT_FOUND');
    return tax;
  }

  async createTax(body: CreateTaxDto, actorUserId?: number): Promise<Tax> {
    const values = this.normalizeCreate(body);
    if (actorUserId === undefined) return this.taxRepository.save(this.taxRepository.create(values));
    return this.runWrite(actorUserId, async (manager) => {
      const repository = manager.getRepository(Tax);
      const saved = await repository.save(repository.create(values));
      await this.writeAudit(manager, actorUserId, 'tax.created', saved, values);
      return saved;
    });
  }

  async updateTax(id: number, body: UpdateTaxDto, actorUserId?: number): Promise<Tax> {
    this.validateId(id);
    const values = this.normalizeUpdate(body);
    const update = async (repository: Repository<Tax>) => {
      const tax = await repository.findOne({ where: { id } });
      if (!tax) throw new NotFoundException('TAX_NOT_FOUND');
      return repository.save(Object.assign(tax, values));
    };
    if (actorUserId === undefined) return update(this.taxRepository);
    return this.runWrite(actorUserId, async (manager) => {
      const saved = await update(manager.getRepository(Tax));
      await this.writeAudit(manager, actorUserId, 'tax.updated', saved, values);
      return saved;
    });
  }

  async deleteTax(id: number, actorUserId?: number): Promise<{ id: number; deleted: true }> {
    this.validateId(id);
    if (actorUserId === undefined) throw new Error('TAX_DELETE_ACTOR_REQUIRED');
    return this.runWrite(actorUserId, async (manager) => {
      const repository = manager.getRepository(Tax);
      const tax = await repository
        .createQueryBuilder('tax')
        .setLock('pessimistic_write')
        .where('tax.id = :id', { id })
        .getOne();
      if (!tax) throw new NotFoundException('TAX_NOT_FOUND');

      const references = await manager.query(
        'SELECT COUNT(*) AS referenceCount FROM exam_catalog WHERE tax_id = ?',
        [id],
      ) as Array<{ referenceCount: string | number }>;
      const referenceCount = Number(references[0]?.referenceCount ?? 0);
      if (!Number.isInteger(referenceCount) || referenceCount < 0) {
        throw new Error('TAX_REFERENCE_COUNT_INVALID');
      }
      if (referenceCount > 0) throw new ConflictException('TAX_IN_USE');

      await repository.remove(tax);
      await this.writeAudit(manager, actorUserId, 'tax.deleted', tax, {
        description: tax.description,
        value: Number(tax.value),
        referenceCount,
      });
      return { id: tax.id, deleted: true as const };
    });
  }
  private async runWrite<T>(actorUserId: number, action: (manager: EntityManager) => Promise<T>): Promise<T> {
    if (!this.dataSource) throw new Error('TAX_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(action);
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: number,
    action: 'tax.created' | 'tax.updated' | 'tax.deleted',
    tax: Tax,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (!this.securityAuditService) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    await this.securityAuditService.write(manager, {
      actorUserId,
      action,
      entityType: 'tax',
      entityId: tax.id,
      summary: action === 'tax.created'
        ? 'Impuesto creado'
        : action === 'tax.deleted'
          ? 'Impuesto eliminado'
          : 'Impuesto actualizado',
      metadata,
    });
  }

  private normalizeCreate(body: CreateTaxDto): Partial<Tax> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('TAX_BODY_REQUIRED');
    return {
      description: this.normalizeDescription(body.description),
      value: this.normalizeValue(body.value),
      only_dollars: this.normalizeBoolean(body.only_dollars, false),
      always_subtotal: this.normalizeBoolean(body.always_subtotal, false),
      hide: this.normalizeBoolean(body.hide, false),
    };
  }

  private normalizeUpdate(body: UpdateTaxDto): Partial<Tax> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('TAX_UPDATE_REQUIRED');
    const allowed = ['description', 'value', 'only_dollars', 'always_subtotal', 'hide'];
    const fields = Object.keys(body);
    if (fields.length === 0) throw new BadRequestException('TAX_UPDATE_REQUIRED');
    if (fields.some((field) => !allowed.includes(field))) throw new BadRequestException('TAX_FIELD_UNKNOWN');
    const values: Partial<Tax> = {};
    if (Object.prototype.hasOwnProperty.call(body, 'description')) values.description = this.normalizeDescription(body.description);
    if (Object.prototype.hasOwnProperty.call(body, 'value')) values.value = this.normalizeValue(body.value);
    for (const field of ['only_dollars', 'always_subtotal', 'hide'] as const) {
      if (Object.prototype.hasOwnProperty.call(body, field)) values[field] = this.normalizeBoolean(body[field]);
    }
    return values;
  }

  private normalizeDescription(value: unknown): string {
    if (typeof value !== 'string') throw new BadRequestException('TAX_DESCRIPTION_REQUIRED');
    const normalized = value.trim();
    if (normalized === '') throw new BadRequestException('TAX_DESCRIPTION_REQUIRED');
    if (normalized.length > 20) throw new BadRequestException('TAX_DESCRIPTION_TOO_LONG');
    return normalized;
  }

  private normalizeValue(value: unknown): number {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100) throw new BadRequestException('TAX_VALUE_INVALID');
    return Math.round(number * 100) / 100;
  }

  private normalizeBoolean(value: unknown, fallback?: boolean): boolean {
    if (value === undefined && fallback !== undefined) return fallback;
    if (typeof value !== 'boolean') throw new BadRequestException('TAX_BOOLEAN_INVALID');
    return value;
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('TAX_ID_INVALID');
  }
}
