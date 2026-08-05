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

  @Column('tinyint', { default: () => '0', nullable: true })
  print_invoice: boolean;

  @Column('tinyint', { default: () => '0', nullable: true })
  print_sample_take: boolean;

  @Column('varchar', { length: 100 })
  url: string;

  @Column('int', { default: () => '0' })
  invoice_number: number;

  @Column('int', { default: () => '0' })
  voucher_number: number;

  @Column('int', { default: () => '0' })
  creditnote_number: number;

  @Column({ type: 'char', length: 20 })
  mask_phone: string;

  @Column({ type: 'longtext' })
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

  @Column('longtext', { nullable: true })
  settingQR: string;

  @Column({ type: 'json', nullable: true })
  sendEmail: string;

  @Column({ type: 'longtext' })
  head_html: string;

  @Column({ type: 'longtext' })
  body_html: string;

  @Column({ type: 'longtext' })
  page_html: string;

  @Column('int', { default: 38 })
  maximum_rows_report: number;

  @Column({ type: 'longtext' })
  workshee_format: string;

  @Column('varchar', { length: 100 })
  printer_type: string;

  @Column('varchar', { length: 100 })
  printer_interface: string;

  @Column('varchar', { length: 100 })
  license: string;

  @Column({ type: 'longtext' })
  receipt_format: string;

  @Column('int', { default: 10 })
  rows_description_receipt: number;

  @Column('int', { default: 0 })
  receipt_number: number;
  
  @Column('tinyint', { default: () => '0', nullable: true })
  print_receipt: boolean;
}
