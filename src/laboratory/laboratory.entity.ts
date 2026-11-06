import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'laboratory' })
@Index('UQ_laboratory_access_slug_normalized', ['access_slug'], { unique: true })
export class Laboratory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 63 })
  access_slug: string;

  @Column('varchar', { length: 20, default: 'cloud' })
  service_mode: string;

  @Column('varchar', { length: 80, nullable: true })
  plan_code: string | null;

  @Column('int', { nullable: true })
  plan_id: number | null;

  @Column('varchar', { length: 120, nullable: true })
  plan_name: string | null;

  @Column('text', { nullable: true })
  plan_description: string | null;

  @Column('numeric', { precision: 14, scale: 2, nullable: true })
  plan_price: string | null;

  @Column('char', { length: 3, nullable: true })
  plan_currency: string | null;

  @Column('varchar', { length: 12, nullable: true })
  billing_interval: string | null;
  @Column('varchar', { length: 12, nullable: true })
  plan_type: 'trial' | 'paid' | null;
  @Column('varchar', { length: 12, nullable: true })
  interval_unit: 'day' | 'month' | 'year' | null;
  @Column('int', { nullable: true })
  interval_count: number | null;

  @Column('jsonb', { nullable: true })
  plan_limits_benefits: Record<string, unknown> | null;

  @Column('int', { default: 0 })
  plan_grace_period_days: number;

  @Column('varchar', { length: 24, nullable: true })
  subscription_status: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  service_starts_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  service_expires_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  grace_until: Date | null;

  @Column({ type: 'text', nullable: true })
  perpetual_free_reason: string | null;

  @Column({ type: 'text', nullable: true })
  suspension_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  suspended_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  perpetual_free_granted_at: Date | null;

  @Column('int', { nullable: true })
  perpetual_free_granted_by: number | null;

  @Column({ type: 'text', nullable: true })
  commercial_notes: string | null;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column({ type: 'char', length: 20 })
  rif: string;

  @Column({ type: 'char', length: 20 })
  phone_1: string;

  @Column({ type: 'char', length: 20 })
  phone_2: string;

  @Column('varchar', { length: 100 })
  email: string;

  @Column('varchar', { length: 100 })
  logo: string;

  @Column('boolean', { default: false, nullable: true })
  print_invoice: boolean;

  @Column('boolean', { default: false, nullable: true })
  print_sample_take: boolean;

  @Column('varchar', { length: 100 })
  url: string;

  @Column('int', { default: 0 })
  invoice_number: number;

  @Column('int', { default: 0 })
  voucher_number: number;

  @Column('int', { default: 0 })
  creditnote_number: number;

  @Column({ type: 'char', length: 20 })
  mask_phone: string;

  @Column({ type: 'text' })
  voucher_format: string;

  @Column('int')
  rows_description_invoices: number;

  @Column('varchar', { length: 50 })
  name: string;

  @Column('varchar', { length: 100 })
  business_name: string;

  @Column('varchar', { length: 200 })
  address: string;

  @Column('int', { default: 170 })
  max_height_logo: number;

  @Column('int', { default: 170 })
  max_width_logo: number;

  @Column('text', { nullable: true })
  settingQR: string;

  @Column({ type: 'json', nullable: true })
  sendEmail: string;

  @Column({ type: 'text' })
  head_html: string;

  @Column({ type: 'text' })
  body_html: string;

  @Column({ type: 'text' })
  page_html: string;

  @Column('int', { default: 38 })
  maximum_rows_report: number;

  @Column({ type: 'text' })
  workshee_format: string;

  @Column('varchar', { length: 100 })
  printer_type: string;

  @Column('varchar', { length: 100 })
  printer_interface: string;

  @Column('varchar', { length: 100 })
  license: string;

  @Column({ type: 'text' })
  receipt_format: string;

  @Column('int', { default: 10 })
  rows_description_receipt: number;

  @Column('int', { default: 0 })
  receipt_number: number;

  @Column('boolean', { default: false, nullable: true })
  print_receipt: boolean;
}
