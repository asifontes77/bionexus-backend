import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Laboratory } from './laboratory.entity';

@Entity({ name: 'laboratory_branches' })
@Index('UQ_laboratory_branches_laboratory_code', ['laboratoryId', 'code'], { unique: true })
@Index('IX_laboratory_branches_laboratory_active', ['laboratoryId', 'isActive'])
export class LaboratoryBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { name: 'laboratory_id' })
  laboratoryId: number;

  @ManyToOne(() => Laboratory, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory;

  @Column('varchar', { length: 30 })
  code: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 200, nullable: true })
  address: string | null;

  @Column('varchar', { length: 20, nullable: true })
  phone: string | null;

  @Column('varchar', { length: 100, nullable: true })
  email: string | null;

  @Column('boolean', { name: 'is_main', default: false })
  isMain: boolean;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('int', { name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
