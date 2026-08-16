import { MigrationInterface, QueryRunner } from 'typeorm';
export class ParasiticformsDescriptionUniqueness2026081613300 implements MigrationInterface {
  name = 'ParasiticformsDescriptionUniqueness2026081613300';
  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = await queryRunner.query(`SELECT LOWER(TRIM(description)) normalized_description, COUNT(*) total FROM parasiticforms GROUP BY LOWER(TRIM(description)) HAVING COUNT(*) > 1 OR normalized_description = ''`);
    if (duplicates.length > 0) throw new Error('PARASITICFORM_DESCRIPTION_NORMALIZATION_CONFLICT');
    await queryRunner.query('UPDATE parasiticforms SET description = TRIM(description)');
    await queryRunner.query('ALTER TABLE parasiticforms ADD CONSTRAINT UQ_parasiticforms_description UNIQUE (description)');
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE parasiticforms DROP INDEX UQ_parasiticforms_description');
  }
}
