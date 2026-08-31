import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientResultsEmailHistory1788228000000 implements MigrationInterface {
  name = 'PatientResultsEmailHistory1788228000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE patient_results_email_history (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      patient_id int NOT NULL,
      requested_by_user_id int NOT NULL,
      completed_by_user_id int NULL,
      recipient_email varchar(100) NOT NULL,
      delivery_type varchar(10) NOT NULL,
      status varchar(12) NOT NULL,
      requested_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      completed_at datetime(6) NULL,
      error_code varchar(120) NULL,
      pdf_size_bytes int unsigned NULL,
      result_html_hash char(64) NOT NULL,
      PRIMARY KEY (id),
      KEY IX_patient_results_email_history_patient_requested (patient_id, requested_at),
      KEY IX_patient_results_email_history_requester_requested (requested_by_user_id, requested_at),
      KEY IX_patient_results_email_history_status_requested (status, requested_at),
      CONSTRAINT FK_patient_results_email_history_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT FK_patient_results_email_history_requested_user FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT FK_patient_results_email_history_completed_user FOREIGN KEY (completed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT CK_patient_results_email_history_delivery_type CHECK (delivery_type IN ('send','resend')),
      CONSTRAINT CK_patient_results_email_history_status CHECK (status IN ('started','success','failed'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE patient_results_email_history');
  }
}
