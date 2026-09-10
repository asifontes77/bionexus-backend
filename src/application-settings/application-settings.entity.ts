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
  @Column({ type: 'varchar', length: 16, default: 'es-VE' }) locale: string;
  @Column({ type: 'varchar', length: 64, default: 'America/Caracas' }) time_zone: string;
  @Column({ type: 'varchar', length: 16, default: 'dd/MM/yyyy' }) date_format: string;
  @Column({ type: 'varchar', length: 8, default: 'h12' }) hour_cycle: string;
  @Column({ type: 'varchar', length: 3, default: 'VES' }) currency_code: string;
  @Column({ type: 'varchar', length: 12, default: 'Bs.' }) currency_symbol: string;
  @Column({ type: 'varchar', length: 8, default: 'before' }) currency_symbol_position: string;
  @Column({ type: 'varchar', length: 3, default: 'VES' }) financial_primary_currency: string;
  @Column({ type: 'varchar', length: 12, default: 'USD' }) base_currency_symbol: string;
  @Column({ type: 'varchar', length: 8, default: 'before' }) base_currency_symbol_position: string;
  @Column({ type: 'int', default: 2 }) monetary_decimals: number;
  @Column({ type: 'varchar', length: 8, default: 'monday' }) first_day_of_week: string;
  @Column({ type: 'varchar', length: 1, default: ',' }) decimal_separator: string;
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
