import { MigrationInterface, QueryRunner } from 'typeorm';

export class CurrencySingleSourceOfTruth1789258800000 implements MigrationInterface {
  name = 'CurrencySingleSourceOfTruth1789258800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const roleRows: Array<{ local_count: string | number; base_count: string | number }> = await queryRunner.query(
      `SELECT SUM(is_local = 1 AND is_active = 1) local_count,
              SUM(is_base = 1 AND is_active = 1) base_count
         FROM currencies`,
    );
    if (Number(roleRows[0]?.local_count) !== 1 || Number(roleRows[0]?.base_count) !== 1) {
      throw new Error('CURRENCY_SINGLE_SOURCE_ROLE_COUNT_INVALID');
    }

    const unresolvedTariffs: Array<{ total: string | number }> = await queryRunner.query(
      `SELECT COUNT(*) total
         FROM tariffs tariff
         LEFT JOIN currencies currency ON currency.code = tariff.currency_code
        WHERE currency.id IS NULL`,
    );
    if (Number(unresolvedTariffs[0]?.total) !== 0) {
      throw new Error('CURRENCY_SINGLE_SOURCE_TARIFF_UNRESOLVED');
    }

    await queryRunner.query(
      `UPDATE currencies currency
       INNER JOIN application_settings settings ON settings.currency_code = currency.code
          SET currency.symbol = settings.currency_symbol,
              currency.symbol_position = settings.currency_symbol_position,
              currency.decimal_places = settings.monetary_decimals
        WHERE currency.is_local = 1`,
    );
    await queryRunner.query(
      `UPDATE currencies currency
       INNER JOIN application_settings settings ON currency.is_base = 1
          SET currency.symbol = settings.base_currency_symbol,
              currency.symbol_position = settings.base_currency_symbol_position`,
    );

    await queryRunner.query(
      `ALTER TABLE application_settings
         ADD financial_primary_currency_id int NULL AFTER decimal_separator`,
    );
    await queryRunner.query(
      `UPDATE application_settings settings
       INNER JOIN currencies currency ON currency.code = settings.financial_primary_currency
          SET settings.financial_primary_currency_id = currency.id`,
    );
    await queryRunner.query(
      `ALTER TABLE application_settings
         MODIFY financial_primary_currency_id int NOT NULL,
         ADD KEY IX_application_settings_financial_primary_currency (financial_primary_currency_id),
         ADD CONSTRAINT FK_application_settings_financial_primary_currency
           FOREIGN KEY (financial_primary_currency_id) REFERENCES currencies(id)
           ON DELETE RESTRICT ON UPDATE RESTRICT`,
    );

    await queryRunner.query(`ALTER TABLE tariffs ADD currency_id int NULL AFTER description`);
    await queryRunner.query(
      `UPDATE tariffs tariff
       INNER JOIN currencies currency ON currency.code = tariff.currency_code
          SET tariff.currency_id = currency.id`,
    );
    await queryRunner.query(
      `ALTER TABLE tariffs
         MODIFY currency_id int NOT NULL,
         ADD KEY IX_tariffs_currency (currency_id),
         ADD CONSTRAINT FK_tariffs_currency
           FOREIGN KEY (currency_id) REFERENCES currencies(id)
           ON DELETE RESTRICT ON UPDATE RESTRICT`,
    );

    await queryRunner.query(
      `ALTER TABLE application_settings
         DROP CHECK CK_application_settings_financial_primary_currency,
         DROP CHECK CK_application_settings_base_currency_symbol_position`,
    );
    await queryRunner.query(
      `ALTER TABLE application_settings
         DROP COLUMN currency_code,
         DROP COLUMN currency_symbol,
         DROP COLUMN currency_symbol_position,
         DROP COLUMN financial_primary_currency,
         DROP COLUMN base_currency_symbol,
         DROP COLUMN base_currency_symbol_position,
         DROP COLUMN monetary_decimals`,
    );
    await queryRunner.query(`ALTER TABLE tariffs DROP CHECK CK_tariffs_currency_code`);
    await queryRunner.query(`ALTER TABLE tariffs DROP COLUMN currency_code`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tariffs ADD currency_code varchar(3) NULL AFTER description`);
    await queryRunner.query(
      `UPDATE tariffs tariff
       INNER JOIN currencies currency ON currency.id = tariff.currency_id
          SET tariff.currency_code = currency.code`,
    );
    await queryRunner.query(
      `ALTER TABLE tariffs
         MODIFY currency_code varchar(3) NOT NULL DEFAULT 'USD',
         ADD CONSTRAINT CK_tariffs_currency_code CHECK (currency_code = 'USD')`,
    );
    await queryRunner.query(
      `ALTER TABLE tariffs
         DROP FOREIGN KEY FK_tariffs_currency,
         DROP INDEX IX_tariffs_currency,
         DROP COLUMN currency_id`,
    );

    await queryRunner.query(
      `ALTER TABLE application_settings
         ADD currency_code varchar(3) NULL,
         ADD currency_symbol varchar(12) NULL,
         ADD currency_symbol_position varchar(8) NULL,
         ADD financial_primary_currency varchar(3) NULL,
         ADD base_currency_symbol varchar(12) NULL,
         ADD base_currency_symbol_position varchar(8) NULL,
         ADD monetary_decimals int NULL`,
    );
    await queryRunner.query(
      `UPDATE application_settings settings
       INNER JOIN currencies local_currency ON local_currency.is_local = 1
       INNER JOIN currencies base_currency ON base_currency.is_base = 1
       INNER JOIN currencies primary_currency ON primary_currency.id = settings.financial_primary_currency_id
          SET settings.currency_code = local_currency.code,
              settings.currency_symbol = local_currency.symbol,
              settings.currency_symbol_position = local_currency.symbol_position,
              settings.financial_primary_currency = primary_currency.code,
              settings.base_currency_symbol = base_currency.symbol,
              settings.base_currency_symbol_position = base_currency.symbol_position,
              settings.monetary_decimals = local_currency.decimal_places`,
    );
    await queryRunner.query(
      `ALTER TABLE application_settings
         MODIFY currency_code varchar(3) NOT NULL DEFAULT 'VES',
         MODIFY currency_symbol varchar(12) NOT NULL DEFAULT 'Bs.',
         MODIFY currency_symbol_position varchar(8) NOT NULL DEFAULT 'before',
         MODIFY financial_primary_currency varchar(3) NOT NULL DEFAULT 'VES',
         MODIFY base_currency_symbol varchar(12) NOT NULL DEFAULT 'USD',
         MODIFY base_currency_symbol_position varchar(8) NOT NULL DEFAULT 'before',
         MODIFY monetary_decimals int NOT NULL DEFAULT 2,
         ADD CONSTRAINT CK_application_settings_financial_primary_currency CHECK (financial_primary_currency IN ('VES','USD')),
         ADD CONSTRAINT CK_application_settings_base_currency_symbol_position CHECK (base_currency_symbol_position IN ('before','after'))`,
    );
    await queryRunner.query(
      `ALTER TABLE application_settings
         DROP FOREIGN KEY FK_application_settings_financial_primary_currency,
         DROP INDEX IX_application_settings_financial_primary_currency,
         DROP COLUMN financial_primary_currency_id`,
    );
  }
}