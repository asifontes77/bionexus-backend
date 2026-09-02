import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  AfterLoad,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from 'src/patients/patients.entity';
import { Examgroup } from 'src/exam_group/examgroup.entity';

@Entity({ name: 'patient_exams' })
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int', { default: () => '0' })
  patientsId: number;

  @Column('int', { name: 'exam_catalog_id', default: () => '0' })
  exam_catalog_id: number;

  examlistsId: number;

  @AfterLoad()
  syncLegacyExamCatalogId(): void {
    this.examlistsId = this.exam_catalog_id;
  }

  @Column('varchar', { length: 60 })
  description: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column('int', { default: () => '0' })
  group_id: number;

  @Column('int')
  position: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  price: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  total: number;

  @Column('int', { default: () => '0' })
  status: boolean;

  @Column({ type: 'text', nullable: true })
  result: string;

  @Column('int', { default: () => '0' })
  size: number;

  @Column('int', { nullable: true, default: null })
  processed_id: number | null;

  @Column('int', { nullable: true, default: null })
  approved_id: number | null;

  @Column('varchar', { length: 20, default: 'Exo' })
  tax_description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: () => '0.00' })
  tax_total: number;

  @Column({ type: 'smallint', default: () => '0' })
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
