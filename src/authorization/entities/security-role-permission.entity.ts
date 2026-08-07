import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'security_role_permissions' })
@Index(
  'IX_security_role_permissions_permission',
  ['permissionId'],
)
export class SecurityRolePermission {
  @PrimaryColumn('int', { name: 'role_id' })
  roleId: number;

  @PrimaryColumn('int', { name: 'permission_id' })
  permissionId: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
