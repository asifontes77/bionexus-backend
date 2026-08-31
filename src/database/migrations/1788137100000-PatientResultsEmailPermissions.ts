import { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientResultsEmailPermissions1788137100000 implements MigrationInterface {
  name = 'PatientResultsEmailPermissions1788137100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO security_permissions (
        code, name, description, module, is_active
      ) VALUES
        (
          'patient-results-email.read',
          'Consultar entrega de resultados por correo',
          'Permite consultar pacientes habilitados para entrega de resultados por correo',
          'patient-results-email',
          1
        ),
        (
          'patient-results-email.send',
          'Enviar resultados por correo',
          'Permite enviar resultados aprobados por correo y registrar su trazabilidad',
          'patient-results-email',
          1
        )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        module = VALUES(module),
        is_active = 1
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO security_role_permissions (role_id, permission_id)
      SELECT role.id, permission.id
      FROM security_roles role
      CROSS JOIN security_permissions permission
      WHERE role.code = 'admin'
        AND role.is_active = 1
        AND permission.code IN (
          'patient-results-email.read',
          'patient-results-email.send'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE assignment
      FROM security_role_permissions assignment
      INNER JOIN security_permissions permission
        ON permission.id = assignment.permission_id
      WHERE permission.code IN (
        'patient-results-email.read',
        'patient-results-email.send'
      )
    `);
    await queryRunner.query(`
      DELETE FROM security_permissions
      WHERE code IN (
        'patient-results-email.read',
        'patient-results-email.send'
      )
    `);
  }
}
