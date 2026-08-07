import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'security_roles' })
@Index('UQ_security_roles_code', ['code'], { unique: true })
@Index('IX_security_roles_active', ['isActive'])
export class SecurityRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 60 })
  code: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 250, nullable: true })
  description: string | null;

  @Column('tinyint', { name: 'is_system', default: 0 })
  isSystem: boolean;

  @Column('tinyint', { name: 'is_active', default: 1 })
  isActive: boolean;

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
