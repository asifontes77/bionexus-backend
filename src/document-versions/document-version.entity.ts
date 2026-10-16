import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'document_versions' })
@Index('UQ_document_versions_laboratory_type_number', ['laboratoryId', 'documentType', 'versionNumber'], { unique: true })
@Index('IX_document_versions_active', ['laboratoryId', 'documentType', 'isActive'])
export class DocumentVersion {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'laboratory_id', type: 'int' }) laboratoryId!: number;
  @Column({ name: 'document_type', type: 'varchar', length: 60 }) documentType!: string;
  @Column({ name: 'version_number', type: 'int' }) versionNumber!: number;
  @Column({ name: 'schema_version', type: 'int', default: 1 }) schemaVersion!: number;
  @Column({ name: 'document_json', type: 'json' }) documentJson!: Record<string, unknown>;
  @Column({ name: 'publication_comment', type: 'varchar', length: 250, nullable: true }) publicationComment!: string | null;
  @Column({ name: 'is_active', type: 'tinyint', default: 0 }) isActive!: boolean;
  @Column({ name: 'is_archived', type: 'tinyint', default: 0 }) isArchived!: boolean;
  @Column({ name: 'published_by_user_id', type: 'int' }) publishedByUserId!: number;
  @Column({ name: 'published_at', type: 'datetime', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)' }) publishedAt!: Date;
  @Column({ name: 'activated_by_user_id', type: 'int', nullable: true }) activatedByUserId!: number | null;
  @Column({ name: 'activated_at', type: 'datetime', precision: 6, nullable: true }) activatedAt!: Date | null;
  @Column({ name: 'archived_by_user_id', type: 'int', nullable: true }) archivedByUserId!: number | null;
  @Column({ name: 'archived_at', type: 'datetime', precision: 6, nullable: true }) archivedAt!: Date | null;
}