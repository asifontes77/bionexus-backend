import { Exam } from 'src/exams/exams.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, ManyToOne } from 'typeorm';

@Entity({ name: 'patients' })
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => 0 })
  patient_position: number;

  @Column({ type: 'date' })
  admission_date: Date;

  @Column({ type: 'time' })
  admission_time: Date;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 10 })
  document_number: string;

  @Column({ type: 'char', length: 1 })
  verification_code: string;

  @Column({ type: 'smallint' })
  age: number;

  @Column('varchar', { length: 5, default: 'años' })
  month_year: string;

  @Column('tinyint', { default: () => 0, nullable: true })
  sex: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  birth_date: Date;

  @Column('varchar', { length: 20, nullable: true })
  phone: string;

  @Column('varchar', { length: 60 })
  suggested: string;

  @Column('tinyint', { default: () => 0, nullable: true })
  urgent: boolean;

  @Column('int', { default: () => 0 })
  client_id: number;

  @Column('tinyint', { default: () => 0 })
  process: boolean;

  @Column('varchar', { length: 100, nullable: true })
  observation: string;

  @Column('tinyint', { default: () => 0 })
  approved: boolean;

  @Column('tinyint', { default: () => 0, nullable: true })
  canceled: boolean;

  @Column({ type: 'datetime', nullable: true })
  cancellation_date: Date;

  @Column('int', { default: () => 0 })
  cashier_id: number;

  @Column({ type: 'json', nullable: true })
  foot_payments: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  total_dollars: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  way_pay_dollars: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  total_canceled: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  iva: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  tax_base: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  iva_total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  discount_total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  dollar_price: number;

  @Column({ type: 'datetime', nullable: true })
  dollar_price_date: Date;

  @Column('varchar', { length: 100, nullable: true })
  business_name: string;

  @Column('varchar', { length: 20, nullable: true })
  rif: string;

  @Column('varchar', { length: 250, nullable: true })
  address: string;

  @Column('varchar', { length: 100, nullable: true })
  invoice: string;

  @Column('varchar', { length: 100, nullable: true, default: '' })
  creditnote: string;

  @Column({ type: 'datetime', nullable: true })
  invoice_date: Date;

  @Column({ type: 'datetime', nullable: true })
  deliver_date: Date;

  @Column('int', { default: () => 0 })
  delivery_id: number;

  @Column('varchar', { length: 100, nullable: true })
  receive: string;

  @Column('varchar', { length: 50, nullable: true })
  sample_type: string;

  @Column('varchar', { length: 50, nullable: true })
  sample: string;

  @Column('varchar', { length: 100, nullable: true })
  email: string;

  @Column('tinyint', { default: () => 0 })
  email_sent: boolean;

  @Column('tinyint', { default: () => 0 })
  email_status: boolean;

  @Column('int', { default: () => 0 })
  user_id: number;

  @Column('int', { default: () => 0 })
  user_id_canceled: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'longtext', nullable: true })
  result_html: string;

  @OneToMany(() => Exam, (exam) => exam.patients)
  exams: Exam[];
}
