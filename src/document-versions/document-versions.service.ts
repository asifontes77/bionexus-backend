import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { DocumentDraft } from './document-draft.entity';
import { DocumentVersion } from './document-version.entity';
import { SaveDocumentDraftDto } from './dto/save-document-draft.dto';
import { PublishDocumentVersionDto } from './dto/publish-document-version.dto';

@Injectable()
export class DocumentVersionsService {
  constructor(
    @InjectRepository(DocumentDraft) private readonly drafts: Repository<DocumentDraft>,
    @InjectRepository(DocumentVersion) private readonly versions: Repository<DocumentVersion>,
    private readonly dataSource: DataSource,
    private readonly audit: SecurityAuditService,
  ) {}

  getDraft(laboratoryId: number, documentType: string) {
    this.validateKey(laboratoryId, documentType);
    return this.drafts.findOne({ where: { laboratoryId, documentType: documentType.trim() } });
  }

  getActive(laboratoryId: number, documentType: string) {
    this.validateKey(laboratoryId, documentType);
    return this.versions.findOne({ where: { laboratoryId, documentType: documentType.trim(), isActive: true, isArchived: false } });
  }

  listVersions(laboratoryId: number, documentType: string) {
    this.validateKey(laboratoryId, documentType);
    return this.versions.find({ where: { laboratoryId, documentType: documentType.trim() }, order: { versionNumber: 'DESC' } });
  }

  saveDraft(dto: SaveDocumentDraftDto, actorUserId: number) {
    this.validateDraft(dto);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentDraft);
      const type = dto.documentType.trim();
      let draft = await repository.findOne({ where: { laboratoryId: dto.laboratoryId, documentType: type } });
      if (!draft) {
        draft = repository.create({ laboratoryId: dto.laboratoryId, documentType: type, createdByUserId: actorUserId });
      }
      draft.schemaVersion = dto.schemaVersion;
      draft.documentJson = dto.documentJson;
      draft.sourceVersionId = dto.sourceVersionId ?? null;
      draft.updatedByUserId = actorUserId;
      const saved = await repository.save(draft);
      await this.writeAudit(manager, actorUserId, 'document.draft.saved', 'document_draft', saved.id, 'Borrador de documento guardado', { laboratoryId: saved.laboratoryId, documentType: saved.documentType, schemaVersion: saved.schemaVersion });
      return saved;
    });
  }

  publish(dto: PublishDocumentVersionDto, actorUserId: number) {
    this.validateKey(dto?.laboratoryId, dto?.documentType);
    const comment = this.normalizeComment(dto.publicationComment);
    return this.dataSource.transaction(async (manager) => {
      const drafts = manager.getRepository(DocumentDraft);
      const versions = manager.getRepository(DocumentVersion);
      const type = dto.documentType.trim();
      const draft = await drafts.findOne({ where: { laboratoryId: dto.laboratoryId, documentType: type } });
      if (!draft) throw new NotFoundException('DOCUMENT_DRAFT_NOT_FOUND');
      const current = await versions.createQueryBuilder('version').setLock('pessimistic_write').where('version.laboratory_id = :laboratoryId', { laboratoryId: dto.laboratoryId }).andWhere('version.document_type = :documentType', { documentType: type }).orderBy('version.version_number', 'DESC').getOne();
      const version = versions.create({ laboratoryId: dto.laboratoryId, documentType: type, versionNumber: (current?.versionNumber ?? 0) + 1, schemaVersion: draft.schemaVersion, documentJson: draft.documentJson, publicationComment: comment, isActive: false, isArchived: false, publishedByUserId: actorUserId });
      const saved = await versions.save(version);
      if (dto.activate === true) await this.activateWithManager(manager, saved, actorUserId);
      await this.writeAudit(manager, actorUserId, 'document.version.published', 'document_version', saved.id, 'Version de documento publicada', { laboratoryId: saved.laboratoryId, documentType: saved.documentType, versionNumber: saved.versionNumber, activated: dto.activate === true });
      return versions.findOneByOrFail({ id: saved.id });
    });
  }

  activate(versionId: number, actorUserId: number) {
    this.validateId(versionId, 'DOCUMENT_VERSION_ID_INVALID');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentVersion);
      const version = await repository.findOne({ where: { id: versionId } });
      if (!version) throw new NotFoundException('DOCUMENT_VERSION_NOT_FOUND');
      if (version.isArchived) throw new ConflictException('DOCUMENT_VERSION_ARCHIVED');
      await this.activateWithManager(manager, version, actorUserId);
      await this.writeAudit(manager, actorUserId, 'document.version.activated', 'document_version', version.id, 'Version de documento activada', { laboratoryId: version.laboratoryId, documentType: version.documentType, versionNumber: version.versionNumber });
      return repository.findOneByOrFail({ id: version.id });
    });
  }

  createDraftFromVersion(versionId: number, actorUserId: number) {
    this.validateId(versionId, 'DOCUMENT_VERSION_ID_INVALID');
    return this.dataSource.transaction(async (manager) => {
      const versions = manager.getRepository(DocumentVersion);
      const drafts = manager.getRepository(DocumentDraft);
      const version = await versions.findOne({ where: { id: versionId } });
      if (!version) throw new NotFoundException('DOCUMENT_VERSION_NOT_FOUND');
      let draft = await drafts.findOne({ where: { laboratoryId: version.laboratoryId, documentType: version.documentType } });
      if (!draft) draft = drafts.create({ laboratoryId: version.laboratoryId, documentType: version.documentType, createdByUserId: actorUserId });
      draft.schemaVersion = version.schemaVersion;
      draft.documentJson = version.documentJson;
      draft.sourceVersionId = version.id;
      draft.updatedByUserId = actorUserId;
      const saved = await drafts.save(draft);
      await this.writeAudit(manager, actorUserId, 'document.draft.created_from_version', 'document_draft', saved.id, 'Borrador creado desde version', { sourceVersionId: version.id, versionNumber: version.versionNumber });
      return saved;
    });
  }

  archive(versionId: number, actorUserId: number) {
    this.validateId(versionId, 'DOCUMENT_VERSION_ID_INVALID');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DocumentVersion);
      const version = await repository.findOne({ where: { id: versionId } });
      if (!version) throw new NotFoundException('DOCUMENT_VERSION_NOT_FOUND');
      if (version.isActive) throw new ConflictException('ACTIVE_DOCUMENT_VERSION_CANNOT_BE_ARCHIVED');
      version.isArchived = true;
      version.archivedByUserId = actorUserId;
      version.archivedAt = new Date();
      const saved = await repository.save(version);
      await this.writeAudit(manager, actorUserId, 'document.version.archived', 'document_version', saved.id, 'Version de documento archivada', { versionNumber: saved.versionNumber });
      return saved;
    });
  }

  private async activateWithManager(manager: EntityManager, version: DocumentVersion, actorUserId: number) {
    const repository = manager.getRepository(DocumentVersion);
    await repository.createQueryBuilder().update(DocumentVersion).set({ isActive: false }).where('laboratory_id = :laboratoryId', { laboratoryId: version.laboratoryId }).andWhere('document_type = :documentType', { documentType: version.documentType }).execute();
    version.isActive = true;
    version.activatedByUserId = actorUserId;
    version.activatedAt = new Date();
    await repository.save(version);
  }

  private validateDraft(dto: SaveDocumentDraftDto) {
    this.validateKey(dto?.laboratoryId, dto?.documentType);
    if (!Number.isInteger(dto.schemaVersion) || dto.schemaVersion <= 0) throw new BadRequestException('DOCUMENT_SCHEMA_VERSION_INVALID');
    if (!dto.documentJson || typeof dto.documentJson !== 'object' || Array.isArray(dto.documentJson)) throw new BadRequestException('DOCUMENT_JSON_REQUIRED');
    if (dto.sourceVersionId != null) this.validateId(dto.sourceVersionId, 'DOCUMENT_SOURCE_VERSION_ID_INVALID');
  }

  private validateKey(laboratoryId: number, documentType: string) {
    this.validateId(laboratoryId, 'LABORATORY_ID_INVALID');
    if (typeof documentType !== 'string' || documentType.trim() === '') throw new BadRequestException('DOCUMENT_TYPE_REQUIRED');
    if (documentType.trim().length > 60) throw new BadRequestException('DOCUMENT_TYPE_TOO_LONG');
  }

  private validateId(value: number, error: string) {
    if (!Number.isInteger(value) || value <= 0) throw new BadRequestException(error);
  }

  private normalizeComment(value?: string | null) {
    if (value == null || value.trim() === '') return null;
    if (value.trim().length > 250) throw new BadRequestException('PUBLICATION_COMMENT_TOO_LONG');
    return value.trim();
  }

  private writeAudit(manager: EntityManager, actorUserId: number, action: string, entityType: string, entityId: number, summary: string, metadata: Record<string, unknown>) {
    return this.audit.write(manager, { actorUserId, action, entityType, entityId, summary, metadata });
  }
}