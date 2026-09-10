import { MigrationInterface, QueryRunner } from 'typeorm';

export class TariffPermissions1789002000000 implements MigrationInterface {
  name = 'TariffPermissions1789002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO security_permissions (code,name,description,module,is_active) VALUES
        ('tariffs.read','Consultar tarifas','Permite consultar tarifas y sus estadisticas','tariffs',1),
        ('tariffs.create','Crear tarifas','Permite crear tarifas configurables','tariffs',1),
        ('tariffs.update','Actualizar tarifas','Permite editar codigo, nombre, descripcion y posicion de tarifas','tariffs',1),
        ('tariffs.change-status','Cambiar estado de tarifas','Permite activar o inactivar tarifas','tariffs',1),
        ('tariffs.set-default','Definir tarifa predeterminada','Permite seleccionar la tarifa predeterminada','tariffs',1)
      ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),module=VALUES(module),is_active=1
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO security_role_permissions (role_id,permission_id)
      SELECT role.id,permission.id FROM security_roles role CROSS JOIN security_permissions permission
      WHERE role.code='admin' AND role.is_active=1 AND permission.code IN
      ('tariffs.read','tariffs.create','tariffs.update','tariffs.change-status','tariffs.set-default')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE assignment FROM security_role_permissions assignment INNER JOIN security_permissions permission ON permission.id=assignment.permission_id WHERE permission.code IN ('tariffs.read','tariffs.create','tariffs.update','tariffs.change-status','tariffs.set-default')`,
    );
    await queryRunner.query(
      `DELETE FROM security_permissions WHERE code IN ('tariffs.read','tariffs.create','tariffs.update','tariffs.change-status','tariffs.set-default')`,
    );
  }
}
