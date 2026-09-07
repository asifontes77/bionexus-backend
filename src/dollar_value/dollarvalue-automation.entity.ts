import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'dollar_value_automation' })
export class DollarvalueAutomation {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'tinyint', default: 0 }) enabled: boolean;
  @Column({ type: 'varchar', length: 5, default: '18:00' }) run_time: string;
  @Column({ type: 'varchar', length: 64, default: 'America/Caracas' }) time_zone: string;
  @Column({ type: 'varchar', length: 255, default: 'https://www.bcv.org.ve/' }) bcv_url: string;
  @Column({ type: 'varchar', length: 255, default: 'https://ve.dolarapi.com/v1/dolares/oficial' }) fallback_url: string;
  @Column({ type: 'datetime', nullable: true }) last_started_at: Date | null;
  @Column({ type: 'datetime', nullable: true }) last_finished_at: Date | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) last_status: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) last_source: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) last_error: string | null;
}
