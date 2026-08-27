import { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryPermissions20260827101500 implements MigrationInterface {
  name = 'LaboratoryPermissions20260827101500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO security_permissions (
        code, name, description, module, is_active
      ) VALUES
        ('laboratory.read', 'Consultar configuracion de laboratorio', 'Permite consultar la configuracion del laboratorio', 'laboratory', 1),
        ('laboratory.update', 'Actualizar configuracion de laboratorio', 'Permite actualizar la configuracion del laboratorio', 'laboratory', 1),
        ('laboratory.upload-logo', 'Actualizar logo del laboratorio', 'Permite cargar o reemplazar el logo del laboratorio', 'laboratory', 1)
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
        AND permission.code IN (
          'laboratory.read',
          'laboratory.update',
          'laboratory.upload-logo'
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
        'laboratory.read',
        'laboratory.update',
        'laboratory.upload-logo'
      )
    `);

    await queryRunner.query(`
      DELETE FROM security_permissions
      WHERE code IN (
        'laboratory.read',
        'laboratory.update',
        'laboratory.upload-logo'
      )
    `);
  }
}