import { MigrationInterface, QueryRunner } from 'typeorm';
export class DollarValueAutomation1788746400000 implements MigrationInterface {
  name = 'DollarValueAutomation1788746400000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE dollar_value_automation (id int NOT NULL,enabled tinyint NOT NULL DEFAULT 0,run_time varchar(5) NOT NULL DEFAULT '18:00',time_zone varchar(64) NOT NULL DEFAULT 'America/Caracas',bcv_url varchar(255) NOT NULL DEFAULT 'https://www.bcv.org.ve/',fallback_url varchar(255) NOT NULL DEFAULT 'https://ve.dolarapi.com/v1/dolares/oficial',last_started_at datetime NULL,last_finished_at datetime NULL,last_status varchar(20) NULL,last_source varchar(40) NULL,last_error varchar(500) NULL,PRIMARY KEY(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
    await queryRunner.query(`INSERT INTO dollar_value_automation(id,enabled,run_time,time_zone) VALUES(1,0,'18:00','America/Caracas')`);
    await queryRunner.query(`CREATE TABLE dollar_value_automation_runs (id int NOT NULL AUTO_INCREMENT,started_at datetime NOT NULL,finished_at datetime NULL,status varchar(20) NOT NULL,source varchar(40) NULL,value decimal(18,2) NULL,effective_date date NULL,error varchar(500) NULL,requested_by_user_id int NULL,KEY IX_dollar_automation_runs_started(started_at),KEY IX_dollar_automation_runs_status(status),PRIMARY KEY(id),CONSTRAINT FK_dollar_automation_run_user FOREIGN KEY(requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS dollar_value_automation_runs'); await queryRunner.query('DROP TABLE IF EXISTS dollar_value_automation'); }
}
