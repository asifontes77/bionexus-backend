import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreateTypepaymantDto } from './dto/create-typepayment.dto';
import { UpdateTypepaymantDto } from './dto/update-typepayment.dto';
import { TypePayment } from './typepayment.entity';

@Injectable()
export class TypePaymentService {
  constructor(
    @InjectRepository(TypePayment)
    private readonly typePaymentRepository: Repository<TypePayment>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async getTypepayments(): Promise<TypePayment[]> {
    return this.typePaymentRepository.find({
      order: { description: 'ASC' },
    });
  }

  async getTypepayment(id: number): Promise<TypePayment> {
    this.validateId(id);
    const record = await this.typePaymentRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('TYPEPAYMENT_NOT_FOUND');
    return record;
  }

  async createTypepayment(
    body: CreateTypepaymantDto,
    actorUserId?: number,
  ): Promise<TypePayment> {
    const normalized = this.normalizeCreate(body);
    if (actorUserId === undefined) {
      await this.ensureDescriptionIsUnique(this.typePaymentRepository, normalized.description);
      const record = this.typePaymentRepository.create(normalized);
      return this.typePaymentRepository.save(record);
    }
    if (!this.dataSource) throw new Error('TYPEPAYMENT_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(TypePayment);
      await this.ensureDescriptionIsUnique(repository, normalized.description);
      const saved = await repository.save(repository.create(normalized));
      await this.writeAudit(manager, actorUserId, {
        action: 'typepayment.created',
        entityId: saved.id,
        summary: 'Tipo de pago creado',
        metadata: this.auditMetadata(saved, ['description', 'description_1', 'description_2', 'only_dollars']),
      });
      return saved;
    });
  }

  async updateTypepayment(
    id: number,
    body: UpdateTypepaymantDto,
    actorUserId?: number,
  ): Promise<TypePayment> {
    this.validateId(id);
    const changedFields = this.getChangedFields(body);
    if (changedFields.length === 0) {
      throw new BadRequestException('TYPEPAYMENT_UPDATE_REQUIRED');
    }
    if (actorUserId === undefined) {
      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        const normalizedDescription = this.normalizeRequiredText(body.description, 'TYPEPAYMENT_DESCRIPTION_REQUIRED');
        await this.ensureDescriptionIsUnique(this.typePaymentRepository, normalizedDescription, id);
      }
      return this.updateWithRepository(this.typePaymentRepository, id, body);
    }
    if (!this.dataSource) throw new Error('TYPEPAYMENT_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(TypePayment);
      const existing = await repository.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('TYPEPAYMENT_NOT_FOUND');
      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        const normalizedDescription = this.normalizeRequiredText(body.description, 'TYPEPAYMENT_DESCRIPTION_REQUIRED');
        await this.ensureDescriptionIsUnique(repository, normalizedDescription, id);
      }
      const previous = this.auditMetadata(existing, changedFields);
      const previousAnnulled = Boolean(existing.annulled);
      const saved = await this.updateWithRepository(repository, id, body, existing);
      const currentAnnulled = Boolean(saved.annulled);
      const action = changedFields.includes('annulled') && previousAnnulled !== currentAnnulled
        ? currentAnnulled
          ? 'typepayment.deactivated'
          : 'typepayment.activated'
        : 'typepayment.updated';
      const summary = action === 'typepayment.deactivated'
        ? 'Tipo de pago inactivado'
        : action === 'typepayment.activated'
          ? 'Tipo de pago activado'
          : 'Tipo de pago actualizado';
      await this.writeAudit(manager, actorUserId, {
        action,
        entityId: saved.id,
        summary,
        metadata: {
          previous,
          current: this.auditMetadata(saved, changedFields),
          changedFields,
        },
      });
      return saved;
    });
  }

  private async updateWithRepository(
    repository: Repository<TypePayment>,
    id: number,
    body: UpdateTypepaymantDto,
    existing?: TypePayment,
  ): Promise<TypePayment> {
    const record = existing ?? await repository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('TYPEPAYMENT_NOT_FOUND');
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      record.description = this.normalizeRequiredText(body.description, 'TYPEPAYMENT_DESCRIPTION_REQUIRED');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description_1')) {
      record.description_1 = this.normalizeOptionalText(body.description_1);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description_2')) {
      record.description_2 = this.normalizeOptionalText(body.description_2);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'only_dollars')) {
      record.only_dollars = this.normalizeBoolean(body.only_dollars, 'TYPEPAYMENT_ONLY_DOLLARS_INVALID');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'annulled')) {
      record.annulled = this.normalizeBoolean(body.annulled, 'TYPEPAYMENT_ANNULLED_INVALID');
    }
    return repository.save(record);
  }
  private async ensureDescriptionIsUnique(
    repository: Repository<TypePayment>,
    description: string,
    excludedId?: number,
  ): Promise<void> {
    const normalizedDescription = description.trim().toLocaleLowerCase();
    const records = await repository.find({ select: { id: true, description: true } });
    const duplicate = (records ?? []).some((record) =>
      record.id !== excludedId &&
      String(record.description ?? '').trim().toLocaleLowerCase() === normalizedDescription,
    );
    if (duplicate) {
      throw new BadRequestException('TYPEPAYMENT_DESCRIPTION_ALREADY_EXISTS');
    }
  }


  private normalizeCreate(body: CreateTypepaymantDto): Partial<TypePayment> {
    return {
      description: this.normalizeRequiredText(body?.description, 'TYPEPAYMENT_DESCRIPTION_REQUIRED'),
      description_1: this.normalizeOptionalText(body?.description_1),
      description_2: this.normalizeOptionalText(body?.description_2),
      only_dollars: body?.only_dollars === undefined
        ? false
        : this.normalizeBoolean(body.only_dollars, 'TYPEPAYMENT_ONLY_DOLLARS_INVALID'),
      annulled: false,
    };
  }

  private getChangedFields(body: UpdateTypepaymantDto): string[] {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
    return ['description', 'description_1', 'description_2', 'only_dollars', 'annulled'].filter(
      (field) => Object.prototype.hasOwnProperty.call(body, field),
    );
  }

  private normalizeRequiredText(value: unknown, error: string): string {
    if (typeof value !== 'string' || value.trim() === '') throw new BadRequestException(error);
    if (value.trim().length > 50) throw new BadRequestException('TYPEPAYMENT_TEXT_TOO_LONG');
    return value.trim();
  }

  private normalizeOptionalText(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') throw new BadRequestException('TYPEPAYMENT_TEXT_INVALID');
    if (value.trim().length > 50) throw new BadRequestException('TYPEPAYMENT_TEXT_TOO_LONG');
    return value.trim();
  }

  private normalizeBoolean(value: unknown, error: string): boolean {
    if (typeof value !== 'boolean') throw new BadRequestException(error);
    return value;
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('TYPEPAYMENT_ID_INVALID');
  }

  private auditMetadata(record: TypePayment, fields: string[]): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    for (const field of fields) metadata[field] = record[field as keyof TypePayment];
    return metadata;
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: number,
    input: {
      action: string;
      entityId: number;
      summary: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.securityAuditService) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    await this.securityAuditService.write(manager, {
      actorUserId,
      entityType: 'type_payment',
      ...input,
    });
  }
}
