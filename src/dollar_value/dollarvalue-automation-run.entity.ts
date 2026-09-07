import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'dollar_value_automation_runs' })
export class DollarvalueAutomationRun {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'datetime' }) started_at: Date;
  @Column({ type: 'datetime', nullable: true }) finished_at: Date | null;
  @Column({ type: 'varchar', length: 20 }) status: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) source: string | null;
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) value: number | null;
  @Column({ type: 'date', nullable: true }) effective_date: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) error: string | null;
  @Column({ type: 'int', nullable: true }) requested_by_user_id: number | null;
}
