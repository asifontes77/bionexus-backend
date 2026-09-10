import { MigrationInterface, QueryRunner } from 'typeorm';
export class FinancialPrimaryCurrency1789167600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE application_settings ADD financial_primary_currency varchar(3) NOT NULL DEFAULT 'VES' AFTER currency_symbol_position");
    await queryRunner.query("ALTER TABLE application_settings ADD CONSTRAINT CK_application_settings_financial_primary_currency CHECK (financial_primary_currency IN ('VES','USD'))");
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE application_settings DROP CHECK CK_application_settings_financial_primary_currency');
    await queryRunner.query('ALTER TABLE application_settings DROP COLUMN financial_primary_currency');
  }
}
