import { MigrationInterface, QueryRunner } from 'typeorm';
export class ApplicationSettingsPermissions20260827235000 implements MigrationInterface {
  name = 'ApplicationSettingsPermissions20260827235000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO security_permissions (code,name,description,module,is_active) VALUES ('application-settings.read','Consultar configuracion de la aplicacion','Permite consultar la configuracion global de la aplicacion','application-settings',1),('application-settings.update','Actualizar configuracion de la aplicacion','Permite actualizar la configuracion global de la aplicacion','application-settings',1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),module=VALUES(module),is_active=1`);
    await queryRunner.query(`INSERT IGNORE INTO security_role_permissions (role_id,permission_id) SELECT r.id,p.id FROM security_roles r CROSS JOIN security_permissions p WHERE r.code='admin' AND r.is_active=1 AND p.code IN ('application-settings.read','application-settings.update')`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`DELETE rp FROM security_role_permissions rp INNER JOIN security_permissions p ON p.id=rp.permission_id WHERE p.code IN ('application-settings.read','application-settings.update')`); await queryRunner.query(`DELETE FROM security_permissions WHERE code IN ('application-settings.read','application-settings.update')`); }
}