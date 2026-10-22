import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Laboratory } from '../laboratory/laboratory.entity';
import { Currency } from '../type_payment/currency.entity';
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
  @Column({ type: 'int', name: 'financial_primary_currency_id' }) financial_primary_currency_id: number;
  @ManyToOne(() => Currency, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'financial_primary_currency_id' }) financialPrimaryCurrency: Currency;
  @Column({ type: 'varchar', length: 8, default: 'monday' }) first_day_of_week: string;
  @Column({ type: 'varchar', length: 1, default: ',' }) decimal_separator: string;
  @Column({ type: 'text' }) voucher_format: string;
  @Column({ type: 'text' }) receipt_format: string;
  @Column({ type: 'text' }) head_html: string;
  @Column({ type: 'text' }) body_html: string;
  @Column({ type: 'text' }) page_html: string;
  @Column({ type: 'int', default: 38 }) maximum_rows_report: number;
  @Column({ type: 'text' }) workshee_format: string;
  @Column({ type: 'varchar', length: 100 }) printer_type: string;
  @Column({ type: 'varchar', length: 100 }) printer_interface: string;
}
