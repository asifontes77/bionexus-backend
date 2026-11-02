import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Laboratory } from '../laboratory/laboratory.entity';

@Entity({ name: 'dollar_value_automation' })
@Index('UQ_dollar_value_automation_laboratory', ['laboratoryId'], { unique: true })
export class DollarvalueAutomation {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'laboratory_id', type: 'int' }) laboratoryId: number;
  @ManyToOne(() => Laboratory, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'laboratory_id' }) laboratory: Laboratory;
  @Column({ type: 'boolean', default: false }) enabled: boolean;
  @Column({ type: 'varchar', length: 5, default: '18:00' }) run_time: string;
  @Column({ type: 'varchar', length: 64, default: 'America/Caracas' }) time_zone: string;
  @Column({ type: 'varchar', length: 255, default: 'https://www.bcv.org.ve/' }) bcv_url: string;
  @Column({ type: 'varchar', length: 255, default: 'https://ve.dolarapi.com/v1/dolares/oficial' }) fallback_url: string;
  @Column({ type: 'timestamptz', nullable: true }) last_started_at: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) last_finished_at: Date | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) last_status: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) last_source: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) last_error: string | null;
  @Column({ name: 'last_scheduled_date', type: 'date', nullable: true }) last_scheduled_date: string | null;
}
