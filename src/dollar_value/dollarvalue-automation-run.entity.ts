import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Laboratory } from '../laboratory/laboratory.entity';

@Entity({ name: 'dollar_value_automation_runs' })
@Index('IX_dollar_value_automation_runs_laboratory_started', ['laboratoryId', 'started_at'])
export class DollarvalueAutomationRun {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'laboratory_id', type: 'int' }) laboratoryId: number;
  @ManyToOne(() => Laboratory, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'laboratory_id' }) laboratory: Laboratory;
  @Column({ type: 'timestamptz' }) started_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) finished_at: Date | null;
  @Column({ type: 'varchar', length: 20 }) status: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) source: string | null;
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) value: number | null;
  @Column({ type: 'date', nullable: true }) effective_date: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) error: string | null;
  @Column({ type: 'int', nullable: true }) requested_by_user_id: number | null;
}
