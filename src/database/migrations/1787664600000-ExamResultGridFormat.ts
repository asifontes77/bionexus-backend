import { MigrationInterface, QueryRunner } from 'typeorm';
export class ExamResultGridFormat1787664600000 implements MigrationInterface {
  name = 'ExamResultGridFormat1787664600000';
  async up(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE exam_lists ADD COLUMN format_grid json NULL AFTER format_vue'); }
  async down(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE exam_lists DROP COLUMN format_grid'); }
}
