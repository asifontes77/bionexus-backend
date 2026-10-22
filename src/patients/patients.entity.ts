import {
  Exam } from '../exams/exams.entity';
import { Entity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { PatientProfile } from './patient-profile.entity';

@Entity({ name: 'patient_admissions' })
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  patient_profile_id: number;
  @ManyToOne(() => PatientProfile, (profile) => profile.admissions, { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  @JoinColumn({ name: 'patient_profile_id' })
  patientProfile: PatientProfile;
  @Column('int', { default: 0 })
  patient_position: number;

  @Column({ type: 'date' })
  admission_date: Date;

  @Column({ type: 'time' })
  admission_time: Date;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 10 })
  document_number: string;

  @Column('int')
  receipt_number: number;

  @Column({ type: 'char', length: 1 })
  verification_code: string;

  @Column({ type: 'smallint' })
  age: number;

  @Column('varchar', { length: 5, default: 'años' })
  month_year: string;

  @Column('boolean', { default: false, nullable: true })
  sex: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  birth_date: Date;

  @Column('varchar', { length: 20, nullable: true })
  phone: string;

  @Column('varchar', { length: 60 })
  suggested: string;

  @Column('boolean', { default: false, nullable: true })
  urgent: boolean;

  @Column('int', { default: 0 })
  client_id: number;

  @Column('int', { name: 'tariff_id', nullable: true, default: null })
  tariff_id: number | null;

  @Column('boolean', { default: false })
  process: boolean;

  @Column('varchar', { length: 100, nullable: true })
  observation: string;

  @Column('boolean', { default: false })
  approved: boolean;

  @Column('boolean', { default: false, nullable: true })
  canceled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  cancellation_date: Date;

  @Column({ type: 'json', nullable: true })
  foot_payments: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total_dollars: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  way_pay_dollars: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total_canceled: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  iva: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  tax_base: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  iva_total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  discount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  discount_total: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  dollar_price: number;

  @Column({ type: 'timestamptz', nullable: true })
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

  @Column({ type: 'timestamptz', nullable: true })
  invoice_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deliver_date: Date;

  @Column('int', { nullable: true, default: null })
  delivery_id: number | null;

  @Column('varchar', { length: 100, nullable: true })
  receive: string;

  @Column('varchar', { length: 50, nullable: true })
  sample_type: string;

  @Column('varchar', { length: 50, nullable: true })
  sample: string;

  @Column('varchar', { length: 100, nullable: true })
  email: string;

  @Column('boolean', { default: false })
  email_sent: boolean;

  @Column('boolean', { default: false })
  email_status: boolean;

  @Column('int', { default: 0 })
  user_id: number;

  @Column('int', { default: 0 })
  user_id_canceled: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  result_html: string;

  @OneToMany(() => Exam, (exam) => exam.patients)
  exams: Exam[];
}
