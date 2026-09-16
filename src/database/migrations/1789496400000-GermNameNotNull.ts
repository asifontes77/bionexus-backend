import { MigrationInterface, QueryRunner } from 'typeorm';

export class GermNameNotNull1789496400000 implements MigrationInterface {
  name = 'GermNameNotNull1789496400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `list_germs` MODIFY `germen` varchar(50) NOT NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `list_germs` MODIFY `germen` varchar(50) NULL");
  }
}
