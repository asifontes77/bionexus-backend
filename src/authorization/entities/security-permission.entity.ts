import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'security_permissions' })
@Index('UQ_security_permissions_code', ['code'], { unique: true })
@Index('IX_security_permissions_module', ['module'])
@Index('IX_security_permissions_active', ['isActive'])
export class SecurityPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 120 })
  code: string;

  @Column('varchar', { length: 120 })
  name: string;

  @Column('varchar', { length: 250, nullable: true })
  description: string | null;

  @Column('varchar', { length: 60 })
  module: string;

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
