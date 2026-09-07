import { MigrationInterface, QueryRunner } from 'typeorm';
export class DollarValuePermissions1788742800000 implements MigrationInterface {
  name = 'DollarValuePermissions1788742800000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO security_permissions (code,name,description,module,is_active) VALUES ('dollar-value.read','Consultar valor del dolar','Permite consultar el valor vigente y su historial','dollar-value',1),('dollar-value.update','Publicar valor del dolar','Permite publicar una nueva cotizacion','dollar-value',1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),module=VALUES(module),is_active=1`);
    await queryRunner.query(`INSERT IGNORE INTO security_role_permissions (role_id,permission_id) SELECT role.id,permission.id FROM security_roles role CROSS JOIN security_permissions permission WHERE role.code='admin' AND role.is_active=1 AND permission.code IN ('dollar-value.read','dollar-value.update')`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE assignment FROM security_role_permissions assignment INNER JOIN security_permissions permission ON permission.id=assignment.permission_id WHERE permission.code IN ('dollar-value.read','dollar-value.update')`);
    await queryRunner.query(`DELETE FROM security_permissions WHERE code IN ('dollar-value.read','dollar-value.update')`);
  }
}
