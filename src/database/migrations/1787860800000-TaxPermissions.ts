import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaxPermissions1787860800000 implements MigrationInterface {
  name = 'TaxPermissions1787860800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO security_permissions (code, name, description, module, is_active)
      VALUES
        ('tax.read', 'Consultar impuestos', 'Permite consultar la configuracion de impuestos', 'tax', 1),
        ('tax.create', 'Crear impuestos', 'Permite crear impuestos', 'tax', 1),
        ('tax.update', 'Actualizar impuestos', 'Permite actualizar impuestos', 'tax', 1),
        ('tax.delete', 'Eliminar impuestos', 'Permite eliminar impuestos', 'tax', 1)
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
        AND permission.code IN ('tax.read', 'tax.create', 'tax.update', 'tax.delete')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE assignment
      FROM security_role_permissions assignment
      INNER JOIN security_permissions permission ON permission.id = assignment.permission_id
      WHERE permission.code IN ('tax.read', 'tax.create', 'tax.update', 'tax.delete')
    `);
    await queryRunner.query(`
      DELETE FROM security_permissions
      WHERE code IN ('tax.read', 'tax.create', 'tax.update', 'tax.delete')
    `);
  }
}