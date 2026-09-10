import { MigrationInterface, QueryRunner } from 'typeorm';
export class AdmissionAppliedTariff1789084800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE patient_admissions ADD COLUMN tariff_id int NULL DEFAULT NULL AFTER client_id');
    await queryRunner.query('CREATE INDEX IX_patient_admissions_tariff_id ON patient_admissions (tariff_id)');
    await queryRunner.query('ALTER TABLE patient_admissions ADD CONSTRAINT FK_patient_admissions_tariff_id FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE RESTRICT ON UPDATE RESTRICT');
    const rows = await queryRunner.query('SELECT COUNT(*) total, SUM(tariff_id IS NOT NULL) assigned FROM patient_admissions');
    if (Number(rows[0]?.assigned ?? 0) !== 0) throw new Error('ADMISSION_APPLIED_TARIFF_LEGACY_BACKFILL_FORBIDDEN');
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE patient_admissions DROP FOREIGN KEY FK_patient_admissions_tariff_id');
    await queryRunner.query('DROP INDEX IX_patient_admissions_tariff_id ON patient_admissions');
    await queryRunner.query('ALTER TABLE patient_admissions DROP COLUMN tariff_id');
  }
}
