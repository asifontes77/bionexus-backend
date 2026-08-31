import { MigrationInterface, QueryRunner } from 'typeorm';

export class TypePaymentPermissions1786665600000 implements MigrationInterface {
  name = 'TypePaymentPermissions1786665600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO security_permissions (
        code, name, description, module, is_active
      ) VALUES
        ('typepayment.read', 'Consultar tipos de pago', 'Permite consultar tipos de pago', 'typepayment', 1),
        ('typepayment.create', 'Crear tipos de pago', 'Permite crear tipos de pago', 'typepayment', 1),
        ('typepayment.update', 'Actualizar tipos de pago', 'Permite editar tipos de pago', 'typepayment', 1),
        ('typepayment.change-status', 'Cambiar estado de tipos de pago', 'Permite inactivar o reactivar tipos de pago', 'typepayment', 1)
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
          'typepayment.read',
          'typepayment.create',
          'typepayment.update',
          'typepayment.change-status'
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
        'typepayment.read',
        'typepayment.create',
        'typepayment.update',
        'typepayment.change-status'
      )
    `);
    await queryRunner.query(`
      DELETE FROM security_permissions
      WHERE code IN (
        'typepayment.read',
        'typepayment.create',
        'typepayment.update',
        'typepayment.change-status'
      )
    `);
  }
}
