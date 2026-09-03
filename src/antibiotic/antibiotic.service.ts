import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { Antibiotic } from './antibiotic.entity';
import { CreateAntibioticDto } from './dto/create-antibiotic.dto';
import { UpdateAntibioticDto } from './dto/update-antibiotic.dto';

@Injectable()
export class AntibioticService {
  constructor(@InjectRepository(Antibiotic) private readonly repository: Repository<Antibiotic>, @Optional() private readonly dataSource?: DataSource, @Optional() private readonly audit?: SecurityAuditService) {}

  getAntibioticLists(): Promise<Antibiotic[]> { return this.repository.find({ order: { description: 'ASC' } }); }
  getAntibioticListsOrder(): Promise<Antibiotic[]> { return this.repository.find({ where: { annulled: false }, order: { description: 'ASC' } }); }

  async getAntibiotic(id: number): Promise<Antibiotic> {
    this.validateId(id);
    const record = await this.repository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('ANTIBIOTIC_NOT_FOUND');
    return record;
  }

  async createAntibiotic(body: CreateAntibioticDto, actorUserId?: number): Promise<Antibiotic> {
    const values = this.normalizeCreate(body);
    if (actorUserId === undefined) return this.createWith(this.repository, values);
    if (!this.dataSource) throw new Error('ANTIBIOTIC_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Antibiotic);
      const saved = await this.createWith(repository, values);
      await this.writeAudit(manager, actorUserId, 'antibiotic.created', saved, ['description', 'siglas']);
      return saved;
    });
  }

  async updateAntibiotic(id: number, body: UpdateAntibioticDto, actorUserId?: number): Promise<Antibiotic> {
    this.validateId(id);
    const fields = this.changedFields(body);
    if (fields.length === 0) throw new BadRequestException('ANTIBIOTIC_UPDATE_REQUIRED');
    if (actorUserId === undefined) return this.updateWith(this.repository, id, body);
    if (!this.dataSource) throw new Error('ANTIBIOTIC_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Antibiotic);
      const existing = await repository.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('ANTIBIOTIC_NOT_FOUND');
      const previous = this.metadata(existing, fields);
      const previousAnnulled = Boolean(existing.annulled);
      const saved = await this.updateWith(repository, id, body, existing);
      const action = fields.includes('annulled') && previousAnnulled !== Boolean(saved.annulled)
        ? saved.annulled ? 'antibiotic.deactivated' : 'antibiotic.activated'
        : 'antibiotic.updated';
      await this.writeAudit(manager, actorUserId, action, saved, fields, previous);
      return saved;
    });
  }

  private async createWith(repository: Repository<Antibiotic>, values: Partial<Antibiotic>): Promise<Antibiotic> {
    await this.ensureUnique(repository, String(values.description));
    return this.save(repository, repository.create(values));
  }

  private async updateWith(repository: Repository<Antibiotic>, id: number, body: UpdateAntibioticDto, existing?: Antibiotic): Promise<Antibiotic> {
    const record = existing ?? await repository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('ANTIBIOTIC_NOT_FOUND');
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      const description = this.text(body.description, 50, 'ANTIBIOTIC_DESCRIPTION_REQUIRED', 'ANTIBIOTIC_DESCRIPTION_TOO_LONG');
      await this.ensureUnique(repository, description, id);
      record.description = description;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'siglas')) record.siglas = this.text(body.siglas, 10, 'ANTIBIOTIC_INITIALS_REQUIRED', 'ANTIBIOTIC_INITIALS_TOO_LONG');
    if (Object.prototype.hasOwnProperty.call(body, 'annulled')) {
      if (typeof body.annulled !== 'boolean') throw new BadRequestException('ANTIBIOTIC_ANNULLED_INVALID');
      record.annulled = body.annulled;
    }
    return this.save(repository, record);
  }

  private normalizeCreate(body: CreateAntibioticDto): Partial<Antibiotic> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('ANTIBIOTIC_BODY_REQUIRED');
    return { description: this.text(body.description, 50, 'ANTIBIOTIC_DESCRIPTION_REQUIRED', 'ANTIBIOTIC_DESCRIPTION_TOO_LONG'), siglas: this.text(body.siglas, 10, 'ANTIBIOTIC_INITIALS_REQUIRED', 'ANTIBIOTIC_INITIALS_TOO_LONG'), annulled: false };
  }

  private changedFields(body: UpdateAntibioticDto): string[] {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
    const allowed = ['description', 'siglas', 'annulled'];
    const fields = Object.keys(body);
    if (fields.some((field) => !allowed.includes(field))) throw new BadRequestException('ANTIBIOTIC_FIELD_UNKNOWN');
    return allowed.filter((field) => Object.prototype.hasOwnProperty.call(body, field));
  }

  private text(value: unknown, maximum: number, required: string, tooLong: string): string {
    if (typeof value !== 'string' || value.trim() === '') throw new BadRequestException(required);
    const normalized = value.trim().toUpperCase();
    if (normalized.length > maximum) throw new BadRequestException(tooLong);
    return normalized;
  }

  private validateId(id: number): void { if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('ANTIBIOTIC_ID_INVALID'); }

  private async ensureUnique(repository: Repository<Antibiotic>, description: string, excludedId?: number): Promise<void> {
    const query = repository.createQueryBuilder('antibiotic').where('LOWER(TRIM(antibiotic.description)) = LOWER(:description)', { description });
    if (excludedId !== undefined) query.andWhere('antibiotic.id <> :excludedId', { excludedId });
    if (await query.getOne()) throw new ConflictException('ANTIBIOTIC_DESCRIPTION_ALREADY_EXISTS');
  }

  private async save(repository: Repository<Antibiotic>, record: Antibiotic): Promise<Antibiotic> {
    try { return await repository.save(record); }
    catch (error) {
      const driverError = error && typeof error === 'object' && 'driverError' in error ? error.driverError as { code?: string } : undefined;
      if (driverError?.code === 'ER_DUP_ENTRY') throw new ConflictException('ANTIBIOTIC_DESCRIPTION_ALREADY_EXISTS');
      throw error;
    }
  }

  private metadata(record: Antibiotic, fields: string[]): Record<string, unknown> { const value: Record<string, unknown> = {}; for (const field of fields) value[field] = record[field as keyof Antibiotic]; return value; }

  private async writeAudit(manager: EntityManager, actorUserId: number, action: string, record: Antibiotic, fields: string[], previous?: Record<string, unknown>): Promise<void> {
    if (!this.audit) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    const summary = action === 'antibiotic.created' ? 'Antibiotico creado' : action === 'antibiotic.activated' ? 'Antibiotico activado' : action === 'antibiotic.deactivated' ? 'Antibiotico inactivado' : 'Antibiotico actualizado';
    await this.audit.write(manager, { actorUserId, action, entityType: 'antibiotic', entityId: record.id, summary, metadata: { previous: previous ?? null, current: this.metadata(record, fields), changedFields: fields } });
  }
}