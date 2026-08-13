import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class SecurityAuditLogs2026081300000
  implements MigrationInterface
{
  name = 'SecurityAuditLogs2026081300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE security_audit_logs (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        occurred_at datetime(6) NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),
        actor_user_id int NULL,
        action varchar(120) NOT NULL,
        entity_type varchar(80) NOT NULL,
        entity_id varchar(100) NULL,
        outcome varchar(20) NOT NULL DEFAULT 'success',
        summary varchar(250) NOT NULL,
        metadata_json json NULL,
        ip_address varchar(45) NULL,
        user_agent varchar(500) NULL,
        PRIMARY KEY (id),
        KEY IX_security_audit_logs_occurred_at (occurred_at),
        KEY IX_security_audit_logs_actor_occurred (
          actor_user_id,
          occurred_at
        ),
        KEY IX_security_audit_logs_entity_occurred (
          entity_type,
          entity_id,
          occurred_at
        ),
        KEY IX_security_audit_logs_action_occurred (
          action,
          occurred_at
        ),
        CONSTRAINT FK_security_audit_logs_actor
          FOREIGN KEY (actor_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
          ON UPDATE RESTRICT
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_general_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS security_audit_logs',
    );
  }
}
