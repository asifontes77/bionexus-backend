import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'security_audit_logs' })
@Index('IX_security_audit_logs_occurred_at', ['occurredAt'])
@Index('IX_security_audit_logs_actor_occurred', [
  'actorUserId',
  'occurredAt',
])
@Index('IX_security_audit_logs_entity_occurred', [
  'entityType',
  'entityId',
  'occurredAt',
])
@Index('IX_security_audit_logs_action_occurred', [
  'action',
  'occurredAt',
])
export class SecurityAuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @CreateDateColumn({
    name: 'occurred_at',
    type: 'datetime',
    precision: 6,
  })
  occurredAt!: Date;

  @Column({ name: 'actor_user_id', type: 'int', nullable: true })
  actorUserId!: number | null;

  @Column({ type: 'varchar', length: 120 })
  action!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 80 })
  entityType!: string;

  @Column({
    name: 'entity_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  entityId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'success' })
  outcome!: string;

  @Column({ type: 'varchar', length: 250 })
  summary!: string;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipAddress!: string | null;

  @Column({
    name: 'user_agent',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  userAgent!: string | null;
}
