import { MigrationInterface, QueryRunner } from 'typeorm';

export class RetireExamResultLegacyFormat20260826191500 implements MigrationInterface {
  name = 'RetireExamResultLegacyFormat20260826191500';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE exam_lists DROP COLUMN format_vue');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE exam_lists ADD COLUMN format_vue json NULL AFTER format');
  }
}
