import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { runControlledMysqlScript } from './controlled-sql-runner';

/**
 * Candidato aislado de la linea base de Bio Nexus.
 * Este archivo no se encuentra en database/migrations y TypeORM no lo carga.
 */
export class BioNexusBaselineCandidate implements MigrationInterface {
  readonly name = 'BioNexusBaselineCandidate';

  async up(queryRunner: QueryRunner): Promise<void> {
    const existingTables = (await queryRunner.query(
      "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
    )) as Array<{ tableCount: string | number }>;
    if (Number(existingTables[0]?.tableCount ?? 0) > 0) {
      throw new Error('BIONEXUS_BASELINE_REQUIRES_EMPTY_DATABASE');
    }
    const sql = readFileSync(join(__dirname, 'BioNexusBaseline.sql'), 'utf8');
    await runControlledMysqlScript(queryRunner, sql);
  }

  async down(): Promise<void> {
    throw new Error('BIONEXUS_BASELINE_DOWN_NOT_AVAILABLE');
  }
}