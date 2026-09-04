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
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}
  getSampletypes(): Promise<SampleType[]> {
    return this.repository.find({ order: { description: 'ASC', id: 'ASC' } });
  }
  async getSampletype(id: number): Promise<SampleType> {
    this.id(id);
    const row = await this.repository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('SAMPLE_TYPE_NOT_FOUND');
    return row;
  }
  async createSampletype(
    body: CreateSampletypeDto,
    actorUserId?: number,
  ): Promise<SampleType> {
    const description = this.description(body?.description);
    await this.unique(this.repository, description);
    if (actorUserId === undefined)
      return this.save(
        this.repository,
        this.repository.create({ description }),
      );
    if (!this.dataSource)
      throw new Error('SAMPLE_TYPE_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(SampleType);
      const saved = await this.save(
        repository,
        repository.create({ description }),
      );
      await this.writeAudit(
        manager,
        actorUserId,
        'sample-types.created',
        saved,
        'Tipo de muestra creado',
      );
      return saved;
    });
  }
  async updateSampletype(
    id: number,
    body: UpdateSampletypeDto,
    actorUserId?: number,
  ): Promise<SampleType> {
    this.id(id);
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !Object.prototype.hasOwnProperty.call(body, 'description')
    )
      throw new BadRequestException('SAMPLE_TYPE_UPDATE_REQUIRED');
    const description = this.description(body.description);
    const execute = async (
      repository: Repository<SampleType>,
      manager?: EntityManager,
    ) => {
      const row = await repository.findOne({ where: { id } });
      if (!row) throw new NotFoundException('SAMPLE_TYPE_NOT_FOUND');
      await this.unique(repository, description, id);
      const previousDescription = row.description;
      row.description = description;
      const saved = await this.save(repository, row);
      if (manager && actorUserId !== undefined)
        await this.writeAudit(
          manager,
          actorUserId,
          'sample-types.updated',
          saved,
          'Tipo de muestra actualizado',
          { previousDescription },
        );
      return saved;
    };
    if (actorUserId === undefined) return execute(this.repository);
    if (!this.dataSource)
      throw new Error('SAMPLE_TYPE_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction((manager) =>
      execute(manager.getRepository(SampleType), manager),
    );
  }
  private id(value: number) {
    if (!Number.isInteger(value) || value <= 0)
      throw new BadRequestException('SAMPLE_TYPE_ID_INVALID');
  }
  private description(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '')
      throw new BadRequestException('SAMPLE_TYPE_DESCRIPTION_REQUIRED');
    const result = value.trim();
    if (result.length > 50)
      throw new BadRequestException('SAMPLE_TYPE_DESCRIPTION_TOO_LONG');
    return result;
  }
  private async unique(
    repository: Repository<SampleType>,
    description: string,
    excludedId?: number,
  ) {
    const query = repository
      .createQueryBuilder('sample')
      .where('LOWER(TRIM(sample.description))=LOWER(:description)', {
        description,
      });
    if (excludedId !== undefined)
      query.andWhere('sample.id<>:excludedId', { excludedId });
    if (await query.getOne())
      throw new ConflictException('SAMPLE_TYPE_DESCRIPTION_ALREADY_EXISTS');
  }
  private async save(repository: Repository<SampleType>, row: SampleType) {
    try {
      return await repository.save(row);
    } catch (error) {
      const driver =
        error && typeof error === 'object' && 'driverError' in error
          ? (error.driverError as { code?: string })
          : undefined;
      if (driver?.code === 'ER_DUP_ENTRY')
        throw new ConflictException('SAMPLE_TYPE_DESCRIPTION_ALREADY_EXISTS');
      throw error;
    }
  }
  private async writeAudit(
    manager: EntityManager,
    actorUserId: number,
    action: string,
    row: SampleType,
    summary: string,
    metadata: Record<string, unknown> = {},
  ) {
    if (!this.audit) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    await this.audit.write(manager, {
      actorUserId,
      action,
      entityType: 'sample_type',
      entityId: row.id,
      summary,
      metadata: { ...metadata, description: row.description },
    });
  }
}
