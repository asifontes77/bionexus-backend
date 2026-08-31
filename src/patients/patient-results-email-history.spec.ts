import { QueryRunner } from 'typeorm';
import { PatientResultsEmailHistory1788228000000 } from '../database/migrations/1788228000000-PatientResultsEmailHistory';

describe('Patient results email history migration', () => {
  it('creates append-only history with users, patient, indexes and checks', async () => {
    const queries: string[] = [];
    const query = jest.fn(async (sql: string) => {
      queries.push(sql);
    });
    const queryRunner = { query } as unknown as QueryRunner;

    await new PatientResultsEmailHistory1788228000000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE patient_results_email_history');
    expect(sql).toContain('requested_by_user_id int NOT NULL');
    expect(sql).toContain('completed_by_user_id int NULL');
    expect(sql).toContain("delivery_type IN ('send','resend')");
    expect(sql).toContain("status IN ('started','success','failed')");
    expect(sql).toContain('REFERENCES patients(id)');
    expect(sql.match(/REFERENCES users\(id\)/g)).toHaveLength(2);
    expect(sql).not.toContain('smtp');
    expect(sql).not.toContain('pdf_content');
  });

  it('drops only the history table on down', async () => {
    const query = jest.fn(async (_sql: string) => undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await new PatientResultsEmailHistory1788228000000().down(queryRunner);

    expect(query).toHaveBeenCalledWith('DROP TABLE patient_results_email_history');
  });
});