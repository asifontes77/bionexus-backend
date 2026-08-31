import { MigrationInterface, QueryRunner } from 'typeorm';

export class RetireExamResultLegacyFormat1787771700000 implements MigrationInterface {
  name = 'RetireExamResultLegacyFormat1787771700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE exam_lists DROP COLUMN format_vue');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE exam_lists ADD COLUMN format_vue json NULL AFTER format');
  }
}
