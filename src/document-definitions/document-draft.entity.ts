import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'document_drafts' })
@Index('UQ_document_drafts_document', ['documentId'], { unique: true })
export class DocumentDraft {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'document_id', type: 'int' }) documentId!: number;
  @Column({ name: 'schema_version', type: 'int', default: 1 }) schemaVersion!: number;
  @Column({ name: 'document_json', type: 'json' }) documentJson!: Record<string, unknown>;
  @Column({ name: 'created_by_user_id', type: 'int' }) createdByUserId!: number;
  @Column({ name: 'updated_by_user_id', type: 'int' }) updatedByUserId!: number;
  @Column({ name: 'created_at', type: 'datetime', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)' }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'datetime', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' }) updatedAt!: Date;
}
