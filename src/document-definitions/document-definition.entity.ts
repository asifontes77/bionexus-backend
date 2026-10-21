import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Defines a configurable document owned by a laboratory. */
@Entity({ name: 'document_definitions' })
@Index('UQ_document_definitions_laboratory_type_name', ['laboratoryId', 'documentType', 'name'], { unique: true })
@Index('IX_document_definitions_active', ['laboratoryId', 'documentType', 'isActive'])
export class DocumentDefinition {
  /** Unique document definition identifier. */
  @PrimaryGeneratedColumn() id!: number;
  /** Laboratory that owns the document. */
  @Column({ name: 'laboratory_id', type: 'int' }) laboratoryId!: number;
  /** Functional document type. */
  @Column({ name: 'document_type', type: 'varchar', length: 60 }) documentType!: string;
  /** User-facing document name. */
  @Column({ type: 'varchar', length: 120 }) name!: string;
  /** Optional user-facing description. */
  @Column({ type: 'varchar', length: 250, nullable: true }) description!: string | null;
  /** Indicates whether the document is selected for operational use. */
  @Column({ name: 'is_active', type: 'tinyint', default: 0 }) isActive!: boolean;
  /** User that created the definition. */
  @Column({ name: 'created_by_user_id', type: 'int' }) createdByUserId!: number;
  /** User that last updated the definition. */
  @Column({ name: 'updated_by_user_id', type: 'int' }) updatedByUserId!: number;
  /** Creation timestamp. */
  @Column({ name: 'created_at', type: 'datetime', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)' }) createdAt!: Date;
  /** Last update timestamp. */
  @Column({ name: 'updated_at', type: 'datetime', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' }) updatedAt!: Date;
}