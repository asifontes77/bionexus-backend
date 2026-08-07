import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'security_user_roles' })
@Index('IX_security_user_roles_role', ['roleId'])
export class SecurityUserRole {
  @PrimaryColumn('int', { name: 'user_id' })
  userId: number;

  @PrimaryColumn('int', { name: 'role_id' })
  roleId: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
