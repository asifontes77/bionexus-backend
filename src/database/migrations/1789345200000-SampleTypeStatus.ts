import { MigrationInterface, QueryRunner } from 'typeorm';
export class SampleTypeStatus1789345200000 implements MigrationInterface {
  name = 'SampleTypeStatus1789345200000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE sample_type ADD COLUMN annulled tinyint NOT NULL DEFAULT 0 AFTER description");
    await queryRunner.query("UPDATE sample_type SET annulled=0 WHERE annulled IS NULL");
    await queryRunner.query("INSERT INTO security_permissions(code,name,description,module,is_active) VALUES ('sample-types.change-status','Cambiar estado de tipos de muestra','Permite activar o inactivar tipos de muestra','sample-types',1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),module=VALUES(module),is_active=1");
    await queryRunner.query("INSERT IGNORE INTO security_role_permissions(role_id,permission_id) SELECT role.id,permission.id FROM security_roles role CROSS JOIN security_permissions permission WHERE role.code='admin' AND role.is_active=1 AND permission.code='sample-types.change-status'");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE assignment FROM security_role_permissions assignment INNER JOIN security_permissions permission ON permission.id=assignment.permission_id WHERE permission.code='sample-types.change-status'");
    await queryRunner.query("DELETE FROM security_permissions WHERE code='sample-types.change-status'");
    await queryRunner.query("ALTER TABLE sample_type DROP COLUMN annulled");
  }
}
