import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExamDomainNormalization1788271200000 implements MigrationInterface {
  name = 'ExamDomainNormalization1788271200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`exam_routine_items\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`routine_id\` int NOT NULL,
      \`exam_catalog_id\` int NOT NULL,
      \`position\` int NOT NULL,
      \`is_active\` tinyint NOT NULL DEFAULT 1,
      \`legacy_active_present\` tinyint NOT NULL DEFAULT 0,
      \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_exam_routine_items_routine_catalog\` (\`routine_id\`,\`exam_catalog_id\`),
      UNIQUE KEY \`UQ_exam_routine_items_routine_position\` (\`routine_id\`,\`position\`),
      KEY \`IDX_exam_routine_items_exam_catalog_id\` (\`exam_catalog_id\`),
      CONSTRAINT \`FK_exam_routine_items_routine\` FOREIGN KEY (\`routine_id\`) REFERENCES \`routines\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT \`FK_exam_routine_items_exam_catalog\` FOREIGN KEY (\`exam_catalog_id\`) REFERENCES \`exam_lists\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);

    await queryRunner.query(`INSERT INTO \`exam_routine_items\` (\`routine_id\`,\`exam_catalog_id\`,\`position\`,\`is_active\`,\`legacy_active_present\`)
      SELECT r.id,j.exam_id,j.position,
        CASE WHEN j.active_present=1 THEN j.active_value ELSE 1 END,
        j.active_present
      FROM \`routines\` r
      JOIN JSON_TABLE(r.registered_exams,'$[*]' COLUMNS(
        position FOR ORDINALITY,
        exam_id INT PATH '$.examId',
        active_value BOOLEAN PATH '$.active',
        active_present INT EXISTS PATH '$.active'
      )) j`);

    const checks = await queryRunner.query(`SELECT
      (SELECT COUNT(*) FROM \`routines\`) AS source_routine_count,
      (SELECT COALESCE(SUM(JSON_LENGTH(registered_exams)),0) FROM \`routines\`) AS source_item_count,
      (SELECT COUNT(*) FROM \`exam_routine_items\`) AS migrated_item_count,
      (SELECT COUNT(DISTINCT routine_id) FROM \`exam_routine_items\`) AS migrated_routine_count,
      (SELECT COUNT(*) FROM \`exam_routine_items\` i LEFT JOIN \`exam_lists\` e ON e.id=i.exam_catalog_id WHERE e.id IS NULL) AS missing_count`);
    const sourceRoutineCount = Number(checks[0]?.source_routine_count);
    const sourceItemCount = Number(checks[0]?.source_item_count);
    const migratedItemCount = Number(checks[0]?.migrated_item_count);
    const migratedRoutineCount = Number(checks[0]?.migrated_routine_count);
    if (migratedItemCount !== sourceItemCount || migratedRoutineCount > sourceRoutineCount || Number(checks[0]?.missing_count) !== 0) {
      throw new Error('EXAM_DOMAIN_DATA_PRESERVATION_FAILED');
    }

    await queryRunner.query('RENAME TABLE `exam_lists` TO `exam_catalog`, `routines` TO `exam_routines`, `exams` TO `patient_exams`');
    await queryRunner.query('ALTER TABLE `patient_exams` CHANGE COLUMN `examlistsId` `exam_catalog_id` int NOT NULL DEFAULT 0');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `patient_exams` CHANGE COLUMN `exam_catalog_id` `examlistsId` int NOT NULL DEFAULT 0');
    await queryRunner.query('RENAME TABLE `exam_catalog` TO `exam_lists`, `exam_routines` TO `routines`, `patient_exams` TO `exams`');
    await queryRunner.query('DROP TABLE `exam_routine_items`');
  }
}
