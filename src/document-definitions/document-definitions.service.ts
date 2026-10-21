import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreateDocumentDefinitionDto } from './dto/create-document-definition.dto';
import { UpdateDocumentDefinitionDto } from './dto/update-document-definition.dto';
import { DocumentDefinition } from './document-definition.entity';
import { DocumentDraft } from './document-draft.entity';
import { SaveDocumentDesignDto } from './dto/save-document-design.dto';

/** Manages document headers independently from drafts and published versions. */
@Injectable()
export class DocumentDefinitionsService {
  constructor(
    @InjectRepository(DocumentDefinition) private readonly definitions: Repository<DocumentDefinition>,
    @InjectRepository(DocumentDraft) private readonly drafts: Repository<DocumentDraft>,
    private readonly dataSource: DataSource,
    private readonly audit: SecurityAuditService,
  ) {}

  // #region Queries

  /** Lists all document definitions for a laboratory. */
  list(laboratoryId: number): Promise<DocumentDefinition[]> {
    this.validateId(laboratoryId, 'LABORATORY_ID_INVALID');
    return this.definitions.find({ where: { laboratoryId }, order: { name: 'ASC' } });
  }

  /** Gets one document definition by identifier. */
  async get(id: number): Promise<DocumentDefinition> {
    this.validateId(id, 'DOCUMENT_DEFINITION_ID_INVALID');
    const definition = await this.definitions.findOne({ where: { id } });
    if (!definition) throw new NotFoundException('DOCUMENT_DEFINITION_NOT_FOUND');
    return definition;
  }

  /** Gets the editable design associated with one document definition. */
  async getDesign(id: number): Promise<DocumentDraft | null> {
    const definition = await this.get(id);
    return this.drafts.findOne({ where: { documentId: definition.id } });
  }

  // #endregion

  // #region Commands

  /** Saves the editable design atomically for one document definition. */
  saveDesign(id: number, dto: SaveDocumentDesignDto, actorUserId: number): Promise<DocumentDraft> {
    this.validateId(id, 'DOCUMENT_DEFINITION_ID_INVALID');
    if (!Number.isInteger(dto?.schemaVersion) || dto.schemaVersion <= 0) throw new BadRequestException('DOCUMENT_SCHEMA_VERSION_INVALID');
    if (!dto?.documentJson || typeof dto.documentJson !== 'object' || Array.isArray(dto.documentJson)) throw new BadRequestException('DOCUMENT_JSON_REQUIRED');
    return this.dataSource.transaction(async (manager) => {
      const definitions = manager.getRepository(DocumentDefinition);
      const drafts = manager.getRepository(DocumentDraft);
      const definition = await definitions.findOne({ where: { id } });
      if (!definition) throw new NotFoundException('DOCUMENT_DEFINITION_NOT_FOUND');
      let draft = await drafts.findOne({ where: { documentId: id } });
      if (!draft) draft = drafts.create({ documentId: id, createdByUserId: actorUserId });
      draft.schemaVersion = dto.schemaVersion;
      draft.documentJson = dto.documentJson;
      draft.updatedByUserId = actorUserId;
      const saved = await drafts.save(draft);
      await this.audit.write(manager, { actorUserId, action: 'document.design.saved', entityType: 'document_draft', entityId: saved.id, summary: 'Diseño de comprobante guardado', metadata: { documentId: id, schemaVersion: saved.schemaVersion } });
      return saved;
    });
  }

  /** Creates a document definition and writes the audit event atomically. */
  create(dto: CreateDocumentDefinitionDto, actorUserId: number): Promise<DocumentDefinition> {
    const input = this.normalizeCreate(dto);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentDefinition);
      const rows = await repository.createQueryBuilder('definition').setLock('pessimistic_write').where('definition.laboratory_id = :laboratoryId', { laboratoryId: input.laboratoryId }).andWhere('definition.document_type = :documentType', { documentType: input.documentType }).getMany();
      await this.ensureNameAvailable(repository, input.laboratoryId, input.documentType, input.name);
      const definition = repository.create({ ...input, isActive: rows.length === 0, createdByUserId: actorUserId, updatedByUserId: actorUserId });
      const saved = await this.save(repository, definition);
      await this.writeAudit(manager, actorUserId, 'document.definition.created', saved, 'Comprobante creado');
      return saved;
    });
  }

  /** Updates editable document definition fields and writes the audit event atomically. */
  update(id: number, dto: UpdateDocumentDefinitionDto, actorUserId: number): Promise<DocumentDefinition> {
    this.validateId(id, 'DOCUMENT_DEFINITION_ID_INVALID');
    const input = this.normalizeUpdate(dto);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentDefinition);
      const definition = await repository.findOne({ where: { id } });
      if (!definition) throw new NotFoundException('DOCUMENT_DEFINITION_NOT_FOUND');
      if (input.name !== undefined) {
        await this.ensureNameAvailable(repository, definition.laboratoryId, definition.documentType, input.name, id);
        definition.name = input.name;
      }
      if (input.hasDescription) definition.description = input.description;
      definition.updatedByUserId = actorUserId;
      const saved = await this.save(repository, definition);
      await this.writeAudit(manager, actorUserId, 'document.definition.updated', saved, 'Comprobante actualizado');
      return saved;
    });
  }

  /** Duplicates one definition and its editable draft as a new inactive definition. */
  duplicate(id: number, actorUserId: number): Promise<DocumentDefinition> {
    this.validateId(id, 'DOCUMENT_DEFINITION_ID_INVALID');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentDefinition);
      const drafts = manager.getRepository(DocumentDraft);
      const source = await repository.createQueryBuilder('definition').setLock('pessimistic_write').where('definition.id = :id', { id }).getOne();
      if (!source) throw new NotFoundException('DOCUMENT_DEFINITION_NOT_FOUND');
      const name = await this.nextCopyName(repository, source.laboratoryId, source.documentType, source.name);
      const copy = repository.create({ laboratoryId: source.laboratoryId, documentType: source.documentType, name, description: source.description, isActive: false, createdByUserId: actorUserId, updatedByUserId: actorUserId });
      const saved = await this.save(repository, copy);
      const sourceDraft = await drafts.findOne({ where: { documentId: source.id } });
      if (sourceDraft) await drafts.save(drafts.create({ documentId: saved.id, schemaVersion: sourceDraft.schemaVersion, documentJson: structuredClone(sourceDraft.documentJson), createdByUserId: actorUserId, updatedByUserId: actorUserId }));
      await this.writeAudit(manager, actorUserId, 'document.definition.duplicated', saved, 'Comprobante duplicado');
      return saved;
    });
  }

  /** Deletes one inactive definition and its editable draft atomically. */
  delete(id: number, actorUserId: number): Promise<{ deleted: true; id: number }> {
    this.validateId(id, 'DOCUMENT_DEFINITION_ID_INVALID');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentDefinition);
      const drafts = manager.getRepository(DocumentDraft);
      const definition = await repository.createQueryBuilder('definition').setLock('pessimistic_write').where('definition.id = :id', { id }).getOne();
      if (!definition) throw new NotFoundException('DOCUMENT_DEFINITION_NOT_FOUND');
      if (definition.isActive) throw new ConflictException('DOCUMENT_DEFINITION_ACTIVE_CANNOT_BE_DELETED');
      await drafts.delete({ documentId: id });
      await repository.remove(definition);
      await this.writeAudit(manager, actorUserId, 'document.definition.deleted', definition, 'Comprobante eliminado');
      return { deleted: true, id };
    });
  }

  /** Activates one definition and atomically replaces the active definition for the same laboratory and type. */
  activate(id: number, actorUserId: number): Promise<DocumentDefinition> {
    return this.changeStatus(id, true, actorUserId);
  }

  /** Changes the definition state while preserving exactly one active definition per laboratory and type. */
  changeStatus(id: number, isActive: boolean, actorUserId: number): Promise<DocumentDefinition> {
    this.validateId(id, 'DOCUMENT_DEFINITION_ID_INVALID');
    if (typeof isActive !== 'boolean') throw new BadRequestException('DOCUMENT_DEFINITION_STATUS_INVALID');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentDefinition);
      const definition = await repository.createQueryBuilder('definition').setLock('pessimistic_write').where('definition.id = :id', { id }).getOne();
      if (!definition) throw new NotFoundException('DOCUMENT_DEFINITION_NOT_FOUND');
      const scope = await repository.createQueryBuilder('definition').setLock('pessimistic_write').where('definition.laboratory_id = :laboratoryId', { laboratoryId: definition.laboratoryId }).andWhere('definition.document_type = :documentType', { documentType: definition.documentType }).orderBy('definition.id', 'ASC').getMany();
      if (definition.isActive === isActive) return definition;
      if (!isActive) {
        const activeCount = scope.filter((item) => item.isActive).length;
        if (activeCount <= 1) throw new ConflictException('DOCUMENT_DEFINITION_LAST_ACTIVE_CANNOT_BE_DEACTIVATED');
      } else {
        for (const item of scope) {
          if (item.id !== definition.id && item.isActive) {
            item.isActive = false;
            item.updatedByUserId = actorUserId;
          }
        }
        await repository.save(scope.filter((item) => item.id !== definition.id));
      }
      definition.isActive = isActive;
      definition.updatedByUserId = actorUserId;
      const saved = await this.save(repository, definition);
      await this.writeAudit(manager, actorUserId, isActive ? 'document.definition.activated' : 'document.definition.deactivated', saved, isActive ? 'Comprobante activado' : 'Comprobante inactivado');
      return saved;
    });
  }
  /** Changes the definition state while preserving exactly one active definition per laboratory and type. */
  // #endregion

  // #region Validation and persistence

  private normalizeCreate(dto: CreateDocumentDefinitionDto) {
    const laboratoryId = dto?.laboratoryId;
    this.validateId(laboratoryId, 'LABORATORY_ID_INVALID');
    return { laboratoryId, documentType: this.normalizeRequired(dto?.documentType, 60, 'DOCUMENT_TYPE'), name: this.normalizeRequired(dto?.name, 120, 'DOCUMENT_NAME'), description: this.normalizeDescription(dto?.description) };
  }

  private normalizeUpdate(dto: UpdateDocumentDefinitionDto) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) throw new BadRequestException('DOCUMENT_DEFINITION_UPDATE_REQUIRED');
    const hasName = Object.prototype.hasOwnProperty.call(dto, 'name');
    const hasDescription = Object.prototype.hasOwnProperty.call(dto, 'description');
    if (!hasName && !hasDescription) throw new BadRequestException('DOCUMENT_DEFINITION_UPDATE_REQUIRED');
    return { name: hasName ? this.normalizeRequired(dto.name, 120, 'DOCUMENT_NAME') : undefined, hasDescription, description: hasDescription ? this.normalizeDescription(dto.description) : undefined };
  }

  private normalizeRequired(value: unknown, maximum: number, code: string): string {
    if (typeof value !== 'string' || value.trim() === '') throw new BadRequestException(code + '_REQUIRED');
    const normalized = value.trim();
    if (normalized.length > maximum) throw new BadRequestException(code + '_TOO_LONG');
    return normalized;
  }

  private normalizeDescription(value: unknown): string | null {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') throw new BadRequestException('DOCUMENT_DESCRIPTION_INVALID');
    const normalized = value.trim();
    if (normalized.length > 250) throw new BadRequestException('DOCUMENT_DESCRIPTION_TOO_LONG');
    return normalized === '' ? null : normalized;
  }

  private validateId(value: number, code: string): void {
    if (!Number.isInteger(value) || value <= 0) throw new BadRequestException(code);
  }

  /** Resolves the first available localized copy name in the definition scope. */
  private async nextCopyName(repository: Repository<DocumentDefinition>, laboratoryId: number, documentType: string, sourceName: string): Promise<string> {
    const base = ('Copia de ' + sourceName).slice(0, 120);
    for (let suffix = 1; suffix <= 9999; suffix++) {
      const label = suffix === 1 ? base : (base.slice(0, 120 - String(suffix).length - 3) + ' (' + suffix + ')');
      const existing = await repository.createQueryBuilder('definition').where('definition.laboratory_id = :laboratoryId', { laboratoryId }).andWhere('definition.document_type = :documentType', { documentType }).andWhere('LOWER(TRIM(definition.name)) = LOWER(:name)', { name: label }).getOne();
      if (!existing) return label;
    }
    throw new ConflictException('DOCUMENT_DEFINITION_COPY_NAME_UNAVAILABLE');
  }

  private async ensureNameAvailable(repository: Repository<DocumentDefinition>, laboratoryId: number, documentType: string, name: string, excludedId?: number): Promise<void> {
    const query = repository.createQueryBuilder('definition').where('definition.laboratory_id = :laboratoryId', { laboratoryId }).andWhere('definition.document_type = :documentType', { documentType }).andWhere('LOWER(TRIM(definition.name)) = LOWER(:name)', { name });
    if (excludedId !== undefined) query.andWhere('definition.id <> :excludedId', { excludedId });
    if (await query.getOne()) throw new ConflictException('DOCUMENT_DEFINITION_NAME_ALREADY_EXISTS');
  }

  private async save(repository: Repository<DocumentDefinition>, definition: DocumentDefinition): Promise<DocumentDefinition> {
    try { return await repository.save(definition); } catch (error) {
      const driverError = error && typeof error === 'object' && 'driverError' in error ? error.driverError as { code?: string } : undefined;
      if (driverError?.code === 'ER_DUP_ENTRY') throw new ConflictException('DOCUMENT_DEFINITION_NAME_ALREADY_EXISTS');
      throw error;
    }
  }

  private writeAudit(manager: EntityManager, actorUserId: number, action: string, definition: DocumentDefinition, summary: string): Promise<void> {
    return this.audit.write(manager, { actorUserId, action, entityType: 'document_definition', entityId: definition.id, summary, metadata: { laboratoryId: definition.laboratoryId, documentType: definition.documentType, name: definition.name, isActive: Boolean(definition.isActive) } });
  }

  // #endregion
}
