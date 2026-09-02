import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoutinesPermissions1788312600000 implements MigrationInterface {
  name = 'RoutinesPermissions1788312600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO security_permissions (code, name, description, module, is_active)
      VALUES
        ('routines.read', 'Consultar rutinas de examenes', 'Permite consultar rutinas y sus examenes', 'routines', 1),
        ('routines.create', 'Crear rutinas de examenes', 'Permite crear rutinas y asignar examenes', 'routines', 1),
        ('routines.update', 'Actualizar rutinas de examenes', 'Permite editar rutinas y sustituir sus examenes', 'routines', 1),
        ('routines.delete', 'Eliminar rutinas de examenes', 'Permite eliminar rutinas y sus relaciones', 'routines', 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name), description = VALUES(description), module = VALUES(module), is_active = 1
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO security_role_permissions (role_id, permission_id)
      SELECT role.id, permission.id
      FROM security_roles role
      CROSS JOIN security_permissions permission
      WHERE role.code = 'admin'
        AND role.is_active = 1
        AND permission.code IN ('routines.read', 'routines.create', 'routines.update', 'routines.delete')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE assignment
      FROM security_role_permissions assignment
      INNER JOIN security_permissions permission ON permission.id = assignment.permission_id
      WHERE permission.code IN ('routines.read', 'routines.create', 'routines.update', 'routines.delete')
    `);
    await queryRunner.query(`
      DELETE FROM security_permissions
      WHERE code IN ('routines.read', 'routines.create', 'routines.update', 'routines.delete')
    `);
  }
}
