import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './patients.entity';
@Entity({ name: 'patient_profiles' })
export class PatientProfile {
  @PrimaryGeneratedColumn() id: number;
  @Column('char', { length: 1, nullable: true }) verification_code: string | null;
  @Column('varchar', { length: 10, nullable: true }) document_number: string | null;
  @Column('varchar', { length: 10, nullable: true }) normalized_document: string | null;
  @Column('varchar', { length: 100 }) name: string;
  @Column({ type: 'date', nullable: true }) birth_date: string | null;
  @Column('tinyint', { nullable: true }) sex: boolean | null;
  @Column('varchar', { length: 20, nullable: true }) phone: string | null;
  @Column('varchar', { length: 100, nullable: true }) email: string | null;
  @Column('varchar', { length: 250, nullable: true }) address: string | null;
  @Column('int') source_admission_id: number;
  @Column('tinyint', { default: 0 }) identity_review_required: boolean;
  @OneToMany(() => Patient, (admission) => admission.patientProfile) admissions: Patient[];
}
