import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PatientResultsEmailDeliveryStatus = 'started' | 'success' | 'failed';
export type PatientResultsEmailDeliveryType = 'send' | 'resend';

@Entity({ name: 'patient_results_email_history' })
@Index('IX_patient_results_email_history_patient_requested', ['patientId', 'requestedAt'])
@Index('IX_patient_results_email_history_requester_requested', ['requestedByUserId', 'requestedAt'])
@Index('IX_patient_results_email_history_status_requested', ['status', 'requestedAt'])
export class PatientResultsEmailHistory {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @Column({ name: 'requested_by_user_id', type: 'int' })
  requestedByUserId!: number;

  @Column({ name: 'completed_by_user_id', type: 'int', nullable: true })
  completedByUserId!: number | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 100 })
  recipientEmail!: string;

  @Column({ name: 'delivery_type', type: 'varchar', length: 10 })
  deliveryType!: PatientResultsEmailDeliveryType;

  @Column({ type: 'varchar', length: 12 })
  status!: PatientResultsEmailDeliveryStatus;

  @CreateDateColumn({ name: 'requested_at', type: 'datetime', precision: 6 })
  requestedAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', precision: 6, nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'error_code', type: 'varchar', length: 120, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'pdf_size_bytes', type: 'int', unsigned: true, nullable: true })
  pdfSizeBytes!: number | null;

  @Column({ name: 'result_html_hash', type: 'char', length: 64 })
  resultHtmlHash!: string;
}
