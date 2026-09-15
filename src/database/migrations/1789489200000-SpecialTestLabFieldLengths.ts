import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpecialTestLabFieldLengths1789489200000 implements MigrationInterface {
  name = 'SpecialTestLabFieldLengths1789489200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `special_test_lab` MODIFY `description` varchar(60) NOT NULL, MODIFY `address` varchar(255) NOT NULL, MODIFY `phone_1` varchar(30) NOT NULL, MODIFY `phone_2` varchar(30) NOT NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `special_test_lab` MODIFY `description` char(40) NOT NULL, MODIFY `address` varchar(200) NOT NULL, MODIFY `phone_1` char(20) NOT NULL, MODIFY `phone_2` char(20) NOT NULL");
  }
}
