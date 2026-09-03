import { MigrationInterface, QueryRunner } from 'typeorm';
export class AntibioticPermissions1788400800000 implements MigrationInterface {
  name = 'AntibioticPermissions1788400800000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO security_permissions (code,name,description,module,is_active) VALUES ('antibiotic.read','Consultar antibioticos','Permite consultar el catalogo de antibioticos','antibiotic',1),('antibiotic.create','Crear antibioticos','Permite crear antibioticos','antibiotic',1),('antibiotic.update','Actualizar antibioticos','Permite editar descripcion y siglas de antibioticos','antibiotic',1),('antibiotic.change-status','Cambiar estado de antibioticos','Permite activar o inactivar antibioticos','antibiotic',1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),module=VALUES(module),is_active=1`);
    await queryRunner.query(`INSERT IGNORE INTO security_role_permissions (role_id,permission_id) SELECT role.id,permission.id FROM security_roles role CROSS JOIN security_permissions permission WHERE role.code='admin' AND role.is_active=1 AND permission.code IN ('antibiotic.read','antibiotic.create','antibiotic.update','antibiotic.change-status')`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE assignment FROM security_role_permissions assignment INNER JOIN security_permissions permission ON permission.id=assignment.permission_id WHERE permission.code IN ('antibiotic.read','antibiotic.create','antibiotic.update','antibiotic.change-status')`);
    await queryRunner.query(`DELETE FROM security_permissions WHERE code IN ('antibiotic.read','antibiotic.create','antibiotic.update','antibiotic.change-status')`);
  }
}