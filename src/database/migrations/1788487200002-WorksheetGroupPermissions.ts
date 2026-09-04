import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorksheetGroupPermissions1788487200002 implements MigrationInterface {
  name = 'WorksheetGroupPermissions1788487200002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO security_permissions (code, name, description, module, is_active) VALUES
      ('worksheet-groups.read', 'Consultar grupos de hojas de trabajo', 'Permite consultar grupos de hojas de trabajo', 'worksheet-groups', 1),
      ('worksheet-groups.create', 'Crear grupos de hojas de trabajo', 'Permite crear grupos de hojas de trabajo', 'worksheet-groups', 1),
      ('worksheet-groups.update', 'Actualizar grupos de hojas de trabajo', 'Permite editar grupos de hojas de trabajo', 'worksheet-groups', 1),
      ('worksheet-groups.change-status', 'Cambiar estado de grupos de hojas de trabajo', 'Permite activar o inactivar grupos de hojas de trabajo', 'worksheet-groups', 1),
      ('worksheet-groups.delete', 'Eliminar grupos de hojas de trabajo', 'Permite eliminar grupos de hojas de trabajo sin elementos relacionados', 'worksheet-groups', 1),
      ('worksheet-group-items.read', 'Consultar elementos de grupos', 'Permite consultar elementos de grupos de hojas de trabajo', 'worksheet-group-items', 1),
      ('worksheet-group-items.create', 'Crear elementos de grupos', 'Permite agregar elementos a grupos de hojas de trabajo', 'worksheet-group-items', 1),
      ('worksheet-group-items.update', 'Actualizar elementos de grupos', 'Permite editar elementos de grupos de hojas de trabajo', 'worksheet-group-items', 1),
      ('worksheet-group-items.delete', 'Eliminar elementos de grupos', 'Permite eliminar elementos de grupos de hojas de trabajo', 'worksheet-group-items', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), module = VALUES(module), is_active = 1`,
    );
    await queryRunner.query(
      `INSERT IGNORE INTO security_role_permissions (role_id, permission_id)
       SELECT role.id, permission.id FROM security_roles role CROSS JOIN security_permissions permission
       WHERE role.code = 'admin' AND role.is_active = 1 AND permission.code IN
       ('worksheet-groups.read','worksheet-groups.create','worksheet-groups.update','worksheet-groups.change-status','worksheet-groups.delete','worksheet-group-items.read','worksheet-group-items.create','worksheet-group-items.update','worksheet-group-items.delete')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE assignment FROM security_role_permissions assignment
       INNER JOIN security_permissions permission ON permission.id = assignment.permission_id
       WHERE permission.code IN
       ('worksheet-groups.read','worksheet-groups.create','worksheet-groups.update','worksheet-groups.change-status','worksheet-groups.delete','worksheet-group-items.read','worksheet-group-items.create','worksheet-group-items.update','worksheet-group-items.delete')`,
    );
    await queryRunner.query(
      `DELETE FROM security_permissions WHERE code IN
       ('worksheet-groups.read','worksheet-groups.create','worksheet-groups.update','worksheet-groups.change-status','worksheet-groups.delete','worksheet-group-items.read','worksheet-group-items.create','worksheet-group-items.update','worksheet-group-items.delete')`,
    );
  }
}
