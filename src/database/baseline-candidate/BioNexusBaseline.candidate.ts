import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Candidato aislado de la linea base de Bio Nexus.
 * Este archivo no se encuentra en database/migrations y TypeORM no lo carga.
 */
export class BioNexusBaselineCandidate implements MigrationInterface {
  readonly name = 'BioNexusBaselineCandidate';

  async up(queryRunner: QueryRunner): Promise<void> {
    const sql = readFileSync(join(__dirname, 'BioNexusBaseline.sql'), 'utf8');
    await queryRunner.query(sql);
  }

  async down(): Promise<void> {
    throw new Error('BIONEXUS_BASELINE_DOWN_NOT_AVAILABLE');
  }
}