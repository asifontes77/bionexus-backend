import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from 'src/patients/patients.entity';
import { Examgroup } from 'src/exam_group/examgroup.entity';

@Entity({ name: 'exams' })
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => 0 })
  patientsId: number;

  @Column('int', { default: () => 0 })
  examlistsId: number;

  @Column('varchar', { length: 60 })
  description: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column('int', { default: () => 0 })
  group_id: number;

  @Column('int')
  position: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  price: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  total: number;

  @Column('int', { default: () => 0 })
  status: boolean;

  @Column({ type: 'text', nullable: true })
  result: string;

  @Column('int', { default: () => 0 })
  size: number;

  @Column('int', { default: () => 0 })
  processed_id: number;

  @Column('int', { default: () => 0 })
  approved_id: number;

  @Column('varchar', { length: 20, default: 'Exo' })
  tax_description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => 0 })
  tax_total: number;

  @Column('int', { default: () => 0 })
  canceled_id: number;

  @Column({ type: 'smallint', default: () => 0 })
  email_status: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => Patient, (patient) => patient.exams)
  patients: Patient;

  @ManyToOne(() => Examgroup, (examGroup) => examGroup.exam)
  @JoinColumn({ name: 'group_id' }) 
  examGroup: Examgroup;
}
