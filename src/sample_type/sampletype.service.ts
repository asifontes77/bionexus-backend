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
import { CreateSampletypeDto } from './dto/create-sampletype.dto';
import { UpdateSampletypeDto } from './dto/update-sampletype.dto';
import { SampleType } from './sampletype.entity';

@Injectable()
export class SampleTypeService {
  constructor(
    @InjectRepository(SampleType)
    private readonly repository: Repository<SampleType>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  getSampletypes(): Promise<SampleType[]> {
    return this.repository.find({ order: { description: 'ASC', id: 'ASC' } });
  }

  async getSampletype(id: number): Promise<SampleType> {
    this.validateId(id);
    const record = await this.repository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('SAMPLE_TYPE_NOT_FOUND');
    return record;
  }

  async createSampletype(
    body: CreateSampletypeDto,
    actorUserId?: number,
  ): Promise<SampleType> {
    const description = this.normalizeDescription(body?.description);
    if (actorUserId === undefined)
      throw new Error('SAMPLE_TYPE_ACTOR_REQUIRED');
    if (!this.dataSource || !this.securityAuditService)
      throw new Error('SAMPLE_TYPE_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(SampleType);
      await this.assertUnique(repository, description);
      const saved = await repository.save(repository.create({ description }));
      await this.writeAudit(
        manager,
        actorUserId,
        'sample-type.created',
        saved,
        ['description'],
      );
      return saved;
    });
  }

  async updateSampletype(
    id: number,
    body: UpdateSampletypeDto,
    actorUserId?: number,
  ): Promise<SampleType> {
    this.validateId(id);
    const fields = this.updateFields(body);
    if (fields.length === 0)
      throw new BadRequestException('SAMPLE_TYPE_UPDATE_REQUIRED');
    if (actorUserId === undefined)
      throw new Error('SAMPLE_TYPE_ACTOR_REQUIRED');
    if (!this.dataSource || !this.securityAuditService)
      throw new Error('SAMPLE_TYPE_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(SampleType);
      const record = await repository.findOne({ where: { id } });
      if (!record) throw new NotFoundException('SAMPLE_TYPE_NOT_FOUND');
      const previous = { description: record.description };
      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        const description = this.normalizeDescription(body.description);
        await this.assertUnique(repository, description, id);
        record.description = description;
      }
      const saved = await repository.save(record);
      await this.writeAudit(
        manager,
        actorUserId,
        'sample-type.updated',
        saved,
        fields,
        previous,
      );
      return saved;
    });
  }

  private updateFields(body: UpdateSampletypeDto): string[] {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
    const allowed = ['description'];
    const keys = Object.keys(body);
    if (keys.some((key) => !allowed.includes(key)))
      throw new BadRequestException('SAMPLE_TYPE_FIELD_UNKNOWN');
    return allowed.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field),
    );
  }

  private normalizeDescription(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '')
      throw new BadRequestException('SAMPLE_TYPE_DESCRIPTION_REQUIRED');
    const description = value.trim();
    if (description.length > 50)
      throw new BadRequestException('SAMPLE_TYPE_DESCRIPTION_TOO_LONG');
    return description;
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0)
      throw new BadRequestException('SAMPLE_TYPE_ID_INVALID');
  }

  private async assertUnique(
    repository: Repository<SampleType>,
    description: string,
    excludedId?: number,
  ): Promise<void> {
    const query = repository
      .createQueryBuilder('sampleType')
      .where('LOWER(TRIM(sampleType.description)) = LOWER(:description)', {
        description,
      });
    if (excludedId !== undefined)
      query.andWhere('sampleType.id <> :excludedId', { excludedId });
    if (await query.getOne())
      throw new ConflictException('SAMPLE_TYPE_DESCRIPTION_ALREADY_EXISTS');
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: number,
    action: string,
    record: SampleType,
    changedFields: string[],
    previous?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.securityAuditService)
      throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    await this.securityAuditService.write(manager, {
      actorUserId,
      action,
      entityType: 'sample_type',
      entityId: record.id,
      summary: action.split('-').join(' '),
      metadata: {
        previous: previous ?? null,
        current: { description: record.description },
        changedFields,
      },
    });
  }
}
