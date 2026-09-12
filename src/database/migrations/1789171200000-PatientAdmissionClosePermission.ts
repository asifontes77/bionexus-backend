import { MigrationInterface, QueryRunner } from 'typeorm';
export class PatientAdmissionClosePermission1789171200000 implements MigrationInterface {
  name = 'PatientAdmissionClosePermission1789171200000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO security_permissions (code,name,description,module,is_active) VALUES ('patient-admission.close','Cerrar ingresos de pacientes','Permite registrar atomicamente paciente, examenes y formas de pago','patient-admission',1) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),module=VALUES(module),is_active=1`);
    await queryRunner.query(`INSERT IGNORE INTO security_role_permissions (role_id,permission_id) SELECT role.id,permission.id FROM security_roles role CROSS JOIN security_permissions permission WHERE role.code='admin' AND role.is_active=1 AND permission.code='patient-admission.close'`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE assignment FROM security_role_permissions assignment INNER JOIN security_permissions permission ON permission.id=assignment.permission_id WHERE permission.code='patient-admission.close'`);
    await queryRunner.query(`DELETE FROM security_permissions WHERE code='patient-admission.close'`);
  }
}
