import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExamCatalogAbbreviationUnique1790452800000 implements MigrationInterface {
  name = 'ExamCatalogAbbreviationUnique1790452800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = await queryRunner.query(`SELECT group_id, UPPER(TRIM(abbreviation)) abbreviation, COUNT(*) total FROM exam_catalog GROUP BY group_id, UPPER(TRIM(abbreviation)) HAVING COUNT(*) > 1`);
    if (duplicates.length > 0) throw new Error('EXAM_CATALOG_ABBREVIATION_DUPLICATES_EXIST');
    const columns = await queryRunner.query(`SELECT COUNT(*) total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exam_catalog' AND COLUMN_NAME='abbreviation_normalized'`);
    if (Number(columns[0]?.total ?? 0) === 0) await queryRunner.query(`ALTER TABLE exam_catalog ADD COLUMN abbreviation_normalized VARCHAR(10) GENERATED ALWAYS AS (UPPER(TRIM(abbreviation))) STORED AFTER abbreviation`);
    const indexes = await queryRunner.query(`SELECT COUNT(*) total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exam_catalog' AND INDEX_NAME='UX_exam_catalog_group_abbreviation'`);
    if (Number(indexes[0]?.total ?? 0) === 0) await queryRunner.query(`ALTER TABLE exam_catalog ADD UNIQUE INDEX UX_exam_catalog_group_abbreviation (group_id, abbreviation_normalized)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = await queryRunner.query(`SELECT COUNT(*) total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exam_catalog' AND INDEX_NAME='UX_exam_catalog_group_abbreviation'`);
    if (Number(indexes[0]?.total ?? 0) > 0) await queryRunner.query(`ALTER TABLE exam_catalog DROP INDEX UX_exam_catalog_group_abbreviation`);
    const columns = await queryRunner.query(`SELECT COUNT(*) total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exam_catalog' AND COLUMN_NAME='abbreviation_normalized'`);
    if (Number(columns[0]?.total ?? 0) > 0) await queryRunner.query(`ALTER TABLE exam_catalog DROP COLUMN abbreviation_normalized`);
  }
}
