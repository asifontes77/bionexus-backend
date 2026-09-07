import { MigrationInterface, QueryRunner } from 'typeorm';
export class ApplicationSettingsRegionalFormats1788750000000 implements MigrationInterface {
  name = 'ApplicationSettingsRegionalFormats1788750000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE application_settings ADD locale varchar(16) NOT NULL DEFAULT 'es-VE', ADD time_zone varchar(64) NOT NULL DEFAULT 'America/Caracas', ADD date_format varchar(16) NOT NULL DEFAULT 'dd/MM/yyyy', ADD hour_cycle varchar(8) NOT NULL DEFAULT 'h12', ADD currency_code varchar(3) NOT NULL DEFAULT 'VES', ADD currency_symbol varchar(12) NOT NULL DEFAULT 'Bs.', ADD currency_symbol_position varchar(8) NOT NULL DEFAULT 'before', ADD monetary_decimals int NOT NULL DEFAULT 2, ADD first_day_of_week varchar(8) NOT NULL DEFAULT 'monday'");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE application_settings DROP COLUMN first_day_of_week, DROP COLUMN monetary_decimals, DROP COLUMN currency_symbol_position, DROP COLUMN currency_symbol, DROP COLUMN currency_code, DROP COLUMN hour_cycle, DROP COLUMN date_format, DROP COLUMN time_zone, DROP COLUMN locale');
  }
}
