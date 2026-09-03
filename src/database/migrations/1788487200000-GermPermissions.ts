import { QueryRunner } from "typeorm";

export class GermPermissions1788487200000 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO security_permissions (code,name,description,module,is_active) VALUES ('germs.read','Consultar germenes','Permite consultar el catalogo de germenes','germs',1),('germs.create','Crear germenes','Permite crear germenes','germs',1),('germs.update','Actualizar germenes','Permite editar germenes','germs',1),('germs.change-status','Cambiar estado de germenes','Permite activar o inactivar germenes','germs',1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),module=VALUES(module),is_active=1`);
    await queryRunner.query(`INSERT IGNORE INTO security_role_permissions (role_id,permission_id) SELECT role.id,permission.id FROM security_roles role CROSS JOIN security_permissions permission WHERE role.code='admin' AND role.is_active=1 AND permission.code IN ('germs.read','germs.create','germs.update','germs.change-status')`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE assignment FROM security_role_permissions assignment INNER JOIN security_permissions permission ON permission.id=assignment.permission_id WHERE permission.code IN ('germs.read','germs.create','germs.update','germs.change-status')`);
    await queryRunner.query(`DELETE FROM security_permissions WHERE code IN ('germs.read','germs.create','germs.update','germs.change-status')`);
  }
}
