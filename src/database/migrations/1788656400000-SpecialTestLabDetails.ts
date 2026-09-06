import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SpecialTestLabDetails1788656400000 implements MigrationInterface {
  name = 'SpecialTestLabDetails1788656400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('special_test_lab', new TableColumn({
      name: 'details',
      type: 'varchar',
      length: '200',
      isNullable: false,
      default: "''",
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('special_test_lab', 'details');
  }
}