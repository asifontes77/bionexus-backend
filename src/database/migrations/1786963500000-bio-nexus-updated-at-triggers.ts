import { MigrationInterface, QueryRunner } from 'typeorm';

export class BioNexusUpdatedAtTriggers1786963500000 implements MigrationInterface {
  name = 'BioNexusUpdatedAtTriggers1786963500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TRIGGER `cash_trigger` BEFORE UPDATE ON `cash_register` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP');
    await queryRunner.query('CREATE TRIGGER `customer_accounts_receivable_before_update` BEFORE UPDATE ON `customer_accounts_receivable` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP');
    await queryRunner.query('CREATE TRIGGER `exams_trigger` BEFORE UPDATE ON `exams` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP');
    await queryRunner.query('CREATE TRIGGER `exam_group_trigger` BEFORE UPDATE ON `exam_group` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP');
    await queryRunner.query('CREATE TRIGGER `exam_lists_trigger` BEFORE UPDATE ON `exam_lists` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP');
    await queryRunner.query('CREATE TRIGGER `patients_trigger` BEFORE UPDATE ON `patients` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP');
    await queryRunner.query('CREATE TRIGGER `users_trigger` BEFORE UPDATE ON `users` FOR EACH ROW SET NEW.updatedAt = CURRENT_TIMESTAMP');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS `users_trigger`');
    await queryRunner.query('DROP TRIGGER IF EXISTS `patients_trigger`');
    await queryRunner.query('DROP TRIGGER IF EXISTS `exam_lists_trigger`');
    await queryRunner.query('DROP TRIGGER IF EXISTS `exam_group_trigger`');
    await queryRunner.query('DROP TRIGGER IF EXISTS `exams_trigger`');
    await queryRunner.query('DROP TRIGGER IF EXISTS `customer_accounts_receivable_before_update`');
    await queryRunner.query('DROP TRIGGER IF EXISTS `cash_trigger`');
  }
}
