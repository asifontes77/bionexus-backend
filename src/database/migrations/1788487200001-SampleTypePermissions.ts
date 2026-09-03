import { MigrationInterface, QueryRunner } from 'typeorm';

export class SampleTypePermissions1788487200001 implements MigrationInterface {
  name = 'SampleTypePermissions1788487200001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO security_permissions (code, name, description, module, is_active) VALUES ('sample-types.read', 'Consultar tipos de muestra', 'Permite consultar el catalogo de tipos de muestra', 'sample-types', 1), ('sample-types.create', 'Crear tipos de muestra', 'Permite crear tipos de muestra', 'sample-types', 1), ('sample-types.update', 'Actualizar tipos de muestra', 'Permite editar tipos de muestra', 'sample-types', 1) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), module = VALUES(module), is_active = 1`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO security_role_permissions (role_id, permission_id) SELECT role.id, permission.id FROM security_roles role CROSS JOIN security_permissions permission WHERE role.code = 'admin' AND role.is_active = 1 AND permission.code IN ('sample-types.read', 'sample-types.create', 'sample-types.update')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE assignment FROM security_role_permissions assignment INNER JOIN security_permissions permission ON permission.id = assignment.permission_id WHERE permission.code IN ('sample-types.read', 'sample-types.create', 'sample-types.update')`,
    );
    await queryRunner.query(
      `DELETE FROM security_permissions WHERE code IN ('sample-types.read', 'sample-types.create', 'sample-types.update')`,
    );
  }
}
