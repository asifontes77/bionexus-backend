import { MigrationInterface, QueryRunner } from 'typeorm';

type CountRow = { total: string | number };
type DifferenceRow = { differences: string | number };

export class ModularTariffsFoundation1788998400000 implements MigrationInterface {
  name = 'ModularTariffsFoundation1788998400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const invalidClients = (await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM client
      WHERE tariff IS NULL OR tariff < 1 OR tariff > 6
    `)) as CountRow[];
    if (Number(invalidClients[0]?.total ?? 0) !== 0) {
      throw new Error('MODULAR_TARIFFS_INVALID_LEGACY_CLIENT_TARIFF');
    }

    await queryRunner.query(`
      CREATE TABLE tariffs (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(60) NOT NULL,
        name varchar(100) NOT NULL,
        description varchar(250) NULL,
        currency_code varchar(3) NOT NULL DEFAULT 'USD',
        position int NOT NULL,
        is_default tinyint NOT NULL DEFAULT 0,
        is_active tinyint NOT NULL DEFAULT 1,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_tariffs_code (code),
        UNIQUE KEY UQ_tariffs_position (position),
        KEY IX_tariffs_active_position (is_active, position),
        CONSTRAINT CK_tariffs_currency_code CHECK (currency_code = 'USD'),
        CONSTRAINT CK_tariffs_position CHECK (position > 0),
        CONSTRAINT CK_tariffs_default_active CHECK (is_default = 0 OR is_active = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      INSERT INTO tariffs (code, name, description, currency_code, position, is_default, is_active)
      VALUES
        ('LEGACY_1', 'Tarifa 1', 'Tarifa migrada desde cost1', 'USD', 1, 1, 1),
        ('LEGACY_2', 'Tarifa 2', 'Tarifa migrada desde cost2', 'USD', 2, 0, 1),
        ('LEGACY_3', 'Tarifa 3', 'Tarifa migrada desde cost3', 'USD', 3, 0, 1),
        ('LEGACY_4', 'Tarifa 4', 'Tarifa migrada desde cost4', 'USD', 4, 0, 1),
        ('LEGACY_5', 'Tarifa 5', 'Tarifa migrada desde cost5', 'USD', 5, 0, 1),
        ('LEGACY_6', 'Tarifa 6', 'Tarifa migrada desde cost6', 'USD', 6, 0, 1)
    `);

    await queryRunner.query(`
      CREATE TABLE exam_tariff_prices (
        id int NOT NULL AUTO_INCREMENT,
        exam_catalog_id int NOT NULL,
        tariff_id int NOT NULL,
        price decimal(18,2) NOT NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_exam_tariff_prices_exam_tariff (exam_catalog_id, tariff_id),
        KEY IX_exam_tariff_prices_tariff (tariff_id),
        KEY IX_exam_tariff_prices_active (is_active),
        CONSTRAINT CK_exam_tariff_prices_price CHECK (price >= 0),
        CONSTRAINT FK_exam_tariff_prices_exam FOREIGN KEY (exam_catalog_id) REFERENCES exam_catalog(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT FK_exam_tariff_prices_tariff FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      INSERT INTO exam_tariff_prices (exam_catalog_id, tariff_id, price, is_active)
      SELECT exam.id, tariff.id,
        CASE tariff.code
          WHEN 'LEGACY_1' THEN exam.cost1
          WHEN 'LEGACY_2' THEN exam.cost2
          WHEN 'LEGACY_3' THEN exam.cost3
          WHEN 'LEGACY_4' THEN exam.cost4
          WHEN 'LEGACY_5' THEN exam.cost5
          WHEN 'LEGACY_6' THEN exam.cost6
        END,
        1
      FROM exam_catalog exam
      CROSS JOIN tariffs tariff
      WHERE tariff.code IN ('LEGACY_1','LEGACY_2','LEGACY_3','LEGACY_4','LEGACY_5','LEGACY_6')
    `);

    await queryRunner.query(
      'ALTER TABLE client ADD COLUMN tariff_id int NULL DEFAULT NULL AFTER tariff',
    );
    await queryRunner.query(`
      UPDATE client client_row
      INNER JOIN tariffs tariff ON tariff.code = CONCAT('LEGACY_', client_row.tariff)
      SET client_row.tariff_id = tariff.id
    `);

    const counts = (await queryRunner.query(`
      SELECT
        (SELECT COUNT(*) FROM tariffs) AS tariff_count,
        (SELECT COUNT(*) FROM exam_catalog) AS exam_count,
        (SELECT COUNT(*) FROM exam_tariff_prices) AS price_count,
        (SELECT COUNT(*) FROM client) AS client_count,
        (SELECT COUNT(*) FROM client WHERE tariff_id IS NOT NULL) AS linked_client_count
    `)) as Array<Record<string, string | number>>;
    const row = counts[0] ?? {};
    if (
      Number(row.tariff_count) !== 6 ||
      Number(row.price_count) !== Number(row.exam_count) * 6 ||
      Number(row.client_count) !== Number(row.linked_client_count)
    ) {
      throw new Error('MODULAR_TARIFFS_COUNT_PRESERVATION_FAILED');
    }

    const differences = (await queryRunner.query(`
      SELECT COUNT(*) AS differences
      FROM exam_catalog exam
      INNER JOIN exam_tariff_prices price ON price.exam_catalog_id = exam.id
      INNER JOIN tariffs tariff ON tariff.id = price.tariff_id
      WHERE price.price <> CASE tariff.code
        WHEN 'LEGACY_1' THEN exam.cost1
        WHEN 'LEGACY_2' THEN exam.cost2
        WHEN 'LEGACY_3' THEN exam.cost3
        WHEN 'LEGACY_4' THEN exam.cost4
        WHEN 'LEGACY_5' THEN exam.cost5
        WHEN 'LEGACY_6' THEN exam.cost6
      END
    `)) as DifferenceRow[];
    if (Number(differences[0]?.differences ?? 0) !== 0) {
      throw new Error('MODULAR_TARIFFS_PRICE_PRESERVATION_FAILED');
    }

    await queryRunner.query('ALTER TABLE client MODIFY tariff_id int NOT NULL');
    await queryRunner.query(
      'CREATE INDEX IX_client_tariff_id ON client (tariff_id)',
    );
    await queryRunner.query(
      'ALTER TABLE client ADD CONSTRAINT FK_client_tariff_id FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE RESTRICT ON UPDATE RESTRICT',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE client DROP FOREIGN KEY FK_client_tariff_id',
    );
    await queryRunner.query('DROP INDEX IX_client_tariff_id ON client');
    await queryRunner.query('ALTER TABLE client DROP COLUMN tariff_id');
    await queryRunner.query('DROP TABLE exam_tariff_prices');
    await queryRunner.query('DROP TABLE tariffs');
  }
}
