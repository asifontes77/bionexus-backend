import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Laboratory } from '../laboratory/laboratory.entity';

@Entity({ name: 'application_settings' })
export class ApplicationSettings {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', unique: true }) laboratory_id: number;
  @ManyToOne(() => Laboratory, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'laboratory_id' }) laboratory: Laboratory;
  @Column({ type: 'int', default: 30 }) session_timeout_minutes: number;
  @Column({ type: 'int', default: 20 }) inactivity_timeout_minutes: number;
  @Column({ type: 'int', default: 120 }) countdown_seconds: number;
  @Column({ type: 'longtext' }) voucher_format: string;
  @Column({ type: 'longtext' }) receipt_format: string;
  @Column({ type: 'longtext' }) head_html: string;
  @Column({ type: 'longtext' }) body_html: string;
  @Column({ type: 'longtext' }) page_html: string;
  @Column({ type: 'int', default: 38 }) maximum_rows_report: number;
  @Column({ type: 'longtext' }) workshee_format: string;
  @Column({ type: 'varchar', length: 100 }) printer_type: string;
  @Column({ type: 'varchar', length: 100 }) printer_interface: string;
}