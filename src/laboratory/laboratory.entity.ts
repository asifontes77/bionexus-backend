import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'laboratory' })
export class Laboratory {
  @PrimaryGeneratedColumn()
  id: number;

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
