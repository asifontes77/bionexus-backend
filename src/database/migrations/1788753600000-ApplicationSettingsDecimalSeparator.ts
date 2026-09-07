import { MigrationInterface, QueryRunner } from 'typeorm';
export class ApplicationSettingsDecimalSeparator1788753600000 implements MigrationInterface {
  name = 'ApplicationSettingsDecimalSeparator1788753600000';
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query("ALTER TABLE application_settings ADD decimal_separator varchar(1) NOT NULL DEFAULT ',' AFTER first_day_of_week"); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE application_settings DROP COLUMN decimal_separator'); }
}
