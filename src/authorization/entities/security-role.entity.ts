import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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

  @Column('boolean', { name: 'is_system', default: false })
  isSystem: boolean;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;
}
