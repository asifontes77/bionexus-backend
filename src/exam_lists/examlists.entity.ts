import { Examgroup } from 'src/exam_group/examgroup.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'exam_lists' })
export class Examlists {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => '0' })
  group_id: number;

  @Column('int', { default: () => '0' })
  position: number;

  @Column('varchar', { length: 60 })
  description: string;

  @Column({ type: 'smallint', default: 1 })
  size: number;

  @Column('tinyint', { default: () => '0' })
  annulled: boolean;

  @Column('varchar', { length: 10 })
  abbreviation: string;

  @Column('tinyint', { default: () => '0' })
  special_test: boolean;

  @Column({ type: 'longtext', nullable: true })
  work_sheet: string;

  @Column('int', { default: () => '0' })
  tax_id: number;

  @Column({ type: 'longtext', nullable: true })
  format: string;

  @Column({ type: 'json', nullable: true })
  format_vue: string;
  @Column({ type: 'json', nullable: true })
  format_grid: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  cost1: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  cost2: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  cost3: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  cost4: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  cost5: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  cost6: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => Examgroup, (examgroup) => examgroup.examlists)
  @JoinColumn({ name: 'group_id' })
  examgroup: Examgroup;
}
