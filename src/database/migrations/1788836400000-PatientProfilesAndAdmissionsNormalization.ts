import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientProfilesAndAdmissionsNormalization1788836400000 implements MigrationInterface {
  name = 'PatientProfilesAndAdmissionsNormalization1788836400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE patient_profiles (
        id INT NOT NULL AUTO_INCREMENT,
        verification_code CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
        document_number VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
        normalized_document VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
        name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
        birth_date DATE NULL,
        sex TINYINT NULL,
        phone VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
        email VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
        address VARCHAR(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
        source_admission_id INT NOT NULL,
        identity_review_required TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY UX_patient_profiles_document (verification_code, normalized_document),
        UNIQUE KEY UX_patient_profiles_source_admission (source_admission_id),
        CONSTRAINT CK_patient_profiles_document_pair CHECK (
          (normalized_document IS NULL AND document_number IS NULL) OR
          (normalized_document IS NOT NULL AND document_number IS NOT NULL)
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`RENAME TABLE patients TO patient_admissions`);
    await queryRunner.query(`ALTER TABLE patient_admissions ADD COLUMN patient_profile_id INT NULL AFTER id`);

    await queryRunner.query(`
      INSERT INTO patient_profiles (
        verification_code, document_number, normalized_document, name, birth_date, sex,
        phone, email, address, source_admission_id, identity_review_required, created_at, updated_at
      )
      SELECT
        NULLIF(UPPER(TRIM(p.verification_code)), ''),
        NULLIF(REGEXP_REPLACE(COALESCE(p.document_number, ''), '[^0-9]', ''), ''),
        NULLIF(REGEXP_REPLACE(COALESCE(p.document_number, ''), '[^0-9]', ''), ''),
        p.name,
        DATE(p.birth_date),
        p.sex,
        NULLIF(TRIM(p.phone), ''),
        NULLIF(TRIM(p.email), ''),
        NULLIF(TRIM(p.address), ''),
        p.id,
        CASE
          WHEN REGEXP_REPLACE(COALESCE(p.document_number, ''), '[^0-9]', '') = '' THEN 1
          WHEN conflicts.birth_variants > 1 OR conflicts.name_variants > 1 OR conflicts.sex_variants > 1 THEN 1
          ELSE 0
        END,
        p.createdAt,
        p.updatedAt
      FROM patient_admissions p
      LEFT JOIN (
        SELECT
          UPPER(TRIM(COALESCE(verification_code, ''))) verification_code,
          REGEXP_REPLACE(COALESCE(document_number, ''), '[^0-9]', '') normalized_document,
          COUNT(DISTINCT DATE(birth_date)) birth_variants,
          COUNT(DISTINCT UPPER(TRIM(name))) name_variants,
          COUNT(DISTINCT sex) sex_variants
        FROM patient_admissions
        WHERE REGEXP_REPLACE(COALESCE(document_number, ''), '[^0-9]', '') <> ''
        GROUP BY UPPER(TRIM(COALESCE(verification_code, ''))), REGEXP_REPLACE(COALESCE(document_number, ''), '[^0-9]', '')
      ) conflicts ON conflicts.verification_code = UPPER(TRIM(COALESCE(p.verification_code, '')))
        AND conflicts.normalized_document = REGEXP_REPLACE(COALESCE(p.document_number, ''), '[^0-9]', '')
      WHERE p.id = (
        SELECT MAX(p2.id)
        FROM patient_admissions p2
        WHERE REGEXP_REPLACE(COALESCE(p.document_number, ''), '[^0-9]', '') <> ''
          AND UPPER(TRIM(COALESCE(p2.verification_code, ''))) = UPPER(TRIM(COALESCE(p.verification_code, '')))
          AND REGEXP_REPLACE(COALESCE(p2.document_number, ''), '[^0-9]', '') = REGEXP_REPLACE(COALESCE(p.document_number, ''), '[^0-9]', '')
      )
      OR REGEXP_REPLACE(COALESCE(p.document_number, ''), '[^0-9]', '') = ''
    `);

    await queryRunner.query(`
      UPDATE patient_admissions a
      JOIN patient_profiles profile ON (
        (profile.normalized_document IS NOT NULL
          AND profile.normalized_document = REGEXP_REPLACE(COALESCE(a.document_number, ''), '[^0-9]', '')
          AND COALESCE(profile.verification_code, '') = UPPER(TRIM(COALESCE(a.verification_code, ''))))
        OR (profile.normalized_document IS NULL AND profile.source_admission_id = a.id)
      )
      SET a.patient_profile_id = profile.id
    `);

    const unlinked = await queryRunner.query(`SELECT COUNT(*) count FROM patient_admissions WHERE patient_profile_id IS NULL`);
    if (Number(unlinked[0]?.count) !== 0) throw new Error('PATIENT_ADMISSION_PROFILE_LINK_INCOMPLETE');

    await queryRunner.query(`ALTER TABLE patient_admissions MODIFY patient_profile_id INT NOT NULL`);
    await queryRunner.query(`CREATE INDEX IDX_patient_admissions_profile_id ON patient_admissions (patient_profile_id)`);
    await queryRunner.query(`ALTER TABLE patient_admissions ADD CONSTRAINT FK_patient_admissions_profile_id FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE patient_admissions DROP FOREIGN KEY FK_patient_admissions_profile_id`);
    await queryRunner.query(`DROP INDEX IDX_patient_admissions_profile_id ON patient_admissions`);
    await queryRunner.query(`ALTER TABLE patient_admissions DROP COLUMN patient_profile_id`);
    await queryRunner.query(`RENAME TABLE patient_admissions TO patients`);
    await queryRunner.query(`DROP TABLE patient_profiles`);
  }
}