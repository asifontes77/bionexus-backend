import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export enum SecurityPermissionEffect {
  Allow = 'allow',
  Deny = 'deny',
}

@Entity({ name: 'security_user_permission_overrides' })
@Index(
  'IX_security_user_permission_overrides_permission',
  ['permissionId'],
)
@Index(
  'IX_security_user_permission_overrides_effect',
  ['effect'],
)
export class SecurityUserPermissionOverride {
  @PrimaryColumn('int', { name: 'user_id' })
  userId: number;

  @PrimaryColumn('int', { name: 'permission_id' })
  permissionId: number;

  @Column({
    type: 'enum',
    enum: SecurityPermissionEffect,
  })
  effect: SecurityPermissionEffect;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
