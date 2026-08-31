import { MigrationInterface, QueryRunner } from 'typeorm';

type CountRow = {
  total: string | number;
};

type RelationDefinition = {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  indexName: string;
  foreignKeyName: string;
};

export class ExamCatalogRelations1786406400000 implements MigrationInterface {
  name = 'ExamCatalogRelations1786406400000';

  private readonly relations: RelationDefinition[] = [
    {
      sourceTable: 'exams',
      sourceColumn: 'examlistsId',
      targetTable: 'exam_lists',
      targetColumn: 'id',
      indexName: 'IDX_exams_examlistsId',
      foreignKeyName: 'FK_exams_examlistsId_exam_lists',
    },
    {
      sourceTable: 'group_ht_items',
      sourceColumn: 'examId',
      targetTable: 'exam_lists',
      targetColumn: 'id',
      indexName: 'IDX_group_ht_items_examId',
      foreignKeyName: 'FK_group_ht_items_examId_exam_lists',
    },
    {
      sourceTable: 'special_test_items',
      sourceColumn: 'exam_list_Id',
      targetTable: 'exam_lists',
      targetColumn: 'id',
      indexName: 'IDX_special_test_items_exam_list_Id',
      foreignKeyName: 'FK_special_test_items_exam_list_Id_exam_lists',
    },
    {
      sourceTable: 'invoice_items',
      sourceColumn: 'id_exams',
      targetTable: 'exam_lists',
      targetColumn: 'id',
      indexName: 'IDX_invoice_items_id_exams',
      foreignKeyName: 'FK_invoice_items_id_exams_exam_lists',
    },
    {
      sourceTable: 'exams',
      sourceColumn: 'processed_id',
      targetTable: 'users',
      targetColumn: 'id',
      indexName: 'IDX_exams_processed_id',
      foreignKeyName: 'FK_exams_processed_id_users',
    },
    {
      sourceTable: 'exams',
      sourceColumn: 'approved_id',
      targetTable: 'users',
      targetColumn: 'id',
      indexName: 'IDX_exams_approved_id',
      foreignKeyName: 'FK_exams_approved_id_users',
    },
    {
      sourceTable: 'patients',
      sourceColumn: 'delivery_id',
      targetTable: 'users',
      targetColumn: 'id',
      indexName: 'IDX_patients_delivery_id',
      foreignKeyName: 'FK_patients_delivery_id_users',
    },
    {
      sourceTable: 'cash_register',
      sourceColumn: 'user_id',
      targetTable: 'users',
      targetColumn: 'id',
      indexName: 'IDX_cash_register_user_id',
      foreignKeyName: 'FK_cash_register_user_id_users',
    },
    {
      sourceTable: 'exam_lists',
      sourceColumn: 'tax_id',
      targetTable: 'tax',
      targetColumn: 'id',
      indexName: 'IDX_exam_lists_tax_id',
      foreignKeyName: 'FK_exam_lists_tax_id_tax',
    },
    {
      sourceTable: 'patients',
      sourceColumn: 'client_id',
      targetTable: 'client',
      targetColumn: 'id',
      indexName: 'IDX_patients_client_id',
      foreignKeyName: 'FK_patients_client_id_client',
    },
    {
      sourceTable: 'patients',
      sourceColumn: 'user_id',
      targetTable: 'users',
      targetColumn: 'id',
      indexName: 'IDX_patients_user_id',
      foreignKeyName: 'FK_patients_user_id_users',
    },
  ];

  private quoteIdentifier(identifier: string): string {
    if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
      throw new Error(`Invalid SQL identifier: ${identifier}`);
    }

    return `\`${identifier}\``;
  }

  private async assertNoUnmatchedRows(
    queryRunner: QueryRunner,
    relation: RelationDefinition,
  ): Promise<void> {
    const sourceTable = this.quoteIdentifier(relation.sourceTable);
    const sourceColumn = this.quoteIdentifier(relation.sourceColumn);
    const targetTable = this.quoteIdentifier(relation.targetTable);
    const targetColumn = this.quoteIdentifier(relation.targetColumn);

    const rows = (await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM ${sourceTable} source
      LEFT JOIN ${targetTable} target
        ON target.${targetColumn} = source.${sourceColumn}
      WHERE source.${sourceColumn} IS NOT NULL
        AND target.${targetColumn} IS NULL
    `)) as CountRow[];

    if (Number(rows[0]?.total ?? 0) !== 0) {
      throw new Error(
        `Cannot create ${relation.foreignKeyName} while unmatched rows exist.`,
      );
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE exams
      MODIFY processed_id int NULL DEFAULT NULL,
      MODIFY approved_id int NULL DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE patients
      MODIFY delivery_id int NULL DEFAULT NULL
    `);

    await queryRunner.query(`
      UPDATE exams
      SET processed_id = NULL
      WHERE processed_id = 0
    `);

    await queryRunner.query(`
      UPDATE exams
      SET approved_id = NULL
      WHERE approved_id = 0
    `);

    await queryRunner.query(`
      UPDATE patients
      SET delivery_id = NULL
      WHERE delivery_id = 0
    `);

    for (const relation of this.relations) {
      await this.assertNoUnmatchedRows(queryRunner, relation);
    }

    await queryRunner.query(`
      ALTER TABLE exams
      DROP COLUMN canceled_id
    `);

    await queryRunner.query(`
      ALTER TABLE patients
      DROP COLUMN cashier_id
    `);

    for (const relation of this.relations) {
      const sourceTable = this.quoteIdentifier(relation.sourceTable);
      const sourceColumn = this.quoteIdentifier(relation.sourceColumn);
      const targetTable = this.quoteIdentifier(relation.targetTable);
      const targetColumn = this.quoteIdentifier(relation.targetColumn);
      const indexName = this.quoteIdentifier(relation.indexName);
      const foreignKeyName = this.quoteIdentifier(relation.foreignKeyName);

      await queryRunner.query(`
        CREATE INDEX ${indexName}
        ON ${sourceTable} (${sourceColumn})
      `);

      await queryRunner.query(`
        ALTER TABLE ${sourceTable}
        ADD CONSTRAINT ${foreignKeyName}
        FOREIGN KEY (${sourceColumn})
        REFERENCES ${targetTable} (${targetColumn})
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const relation of [...this.relations].reverse()) {
      const sourceTable = this.quoteIdentifier(relation.sourceTable);
      const indexName = this.quoteIdentifier(relation.indexName);
      const foreignKeyName = this.quoteIdentifier(relation.foreignKeyName);

      await queryRunner.query(`
        ALTER TABLE ${sourceTable}
        DROP FOREIGN KEY ${foreignKeyName}
      `);

      await queryRunner.query(`
        DROP INDEX ${indexName}
        ON ${sourceTable}
      `);
    }

    await queryRunner.query(`
      ALTER TABLE patients
      ADD COLUMN cashier_id int NOT NULL DEFAULT 0 AFTER cancellation_date
    `);

    await queryRunner.query(`
      ALTER TABLE exams
      ADD COLUMN canceled_id int NOT NULL DEFAULT 0 AFTER tax_total
    `);

    await queryRunner.query(`
      UPDATE exams
      SET processed_id = 0
      WHERE processed_id IS NULL
    `);

    await queryRunner.query(`
      UPDATE exams
      SET approved_id = 0
      WHERE approved_id IS NULL
    `);

    await queryRunner.query(`
      UPDATE patients
      SET delivery_id = 0
      WHERE delivery_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE exams
      MODIFY processed_id int NOT NULL DEFAULT 0,
      MODIFY approved_id int NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE patients
      MODIFY delivery_id int NOT NULL DEFAULT 0
    `);
  }
}
