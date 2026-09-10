import { MigrationInterface, QueryRunner } from 'typeorm';
export class BaseCurrencyPresentation1789171200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE application_settings ADD base_currency_symbol varchar(12) NOT NULL DEFAULT 'USD' AFTER financial_primary_currency, ADD base_currency_symbol_position varchar(8) NOT NULL DEFAULT 'before' AFTER base_currency_symbol");
    await queryRunner.query("ALTER TABLE application_settings ADD CONSTRAINT CK_application_settings_base_currency_symbol_position CHECK (base_currency_symbol_position IN ('before','after'))");
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE application_settings DROP CHECK CK_application_settings_base_currency_symbol_position');
    await queryRunner.query('ALTER TABLE application_settings DROP COLUMN base_currency_symbol_position, DROP COLUMN base_currency_symbol');
  }
}