import { readFileSync, readdirSync } from 'fs';

/** Protege el cierre integral de normalizacion, multilaboratorio y sucursales. */
describe('Database normalization final contract', () => {
  const migration = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');

  /** Verifica las relaciones funcionales restantes. */
  it('keeps all remaining functional foreign keys', () => {
    const constraints = ['FK_document_definitions_laboratory_id', 'FK_document_definitions_created_by_user_id', 'FK_document_definitions_updated_by_user_id', 'FK_document_drafts_document_id', 'FK_document_drafts_created_by_user_id', 'FK_document_drafts_updated_by_user_id', 'FK_dollar_value_automation_runs_requested_by_user_id', 'FK_exam_catalog_tax_id', 'FK_way_pay_id_users', 'FK_way_pay_id_client'];
    for (const constraint of constraints) expect(migration).toContain(constraint);
  });

  /** Verifica todos los alcances restantes por laboratorio. */
  it('keeps all remaining laboratory scopes', () => {
    const constraints = ['FK_antibiotic_laboratory', 'FK_banks_laboratory', 'FK_client_laboratory', 'FK_currencies_laboratory', 'FK_document_drafts_laboratory', 'FK_dollar_value_laboratory', 'FK_dollar_value_automation_laboratory', 'FK_dollar_value_automation_runs_laboratory', 'FK_exam_catalog_laboratory', 'FK_exam_group_laboratory', 'FK_exam_routine_items_laboratory', 'FK_exam_routines_laboratory', 'FK_exam_tariff_prices_laboratory', 'FK_group_ht_laboratory', 'FK_group_ht_items_laboratory', 'FK_list_germs_laboratory', 'FK_parasiticforms_laboratory', 'FK_sample_type_laboratory', 'FK_security_audit_logs_laboratory', 'FK_security_role_permissions_laboratory', 'FK_security_roles_laboratory', 'FK_security_user_permission_overrides_laboratory', 'FK_security_user_roles_laboratory', 'FK_special_test_items_laboratory', 'FK_special_test_lab_laboratory', 'FK_tariffs_laboratory', 'FK_tax_laboratory', 'FK_users_laboratory', 'FK_way_pay_laboratory', 'FK_way_pay_items_laboratory', 'FK_document_definitions_laboratory_id'];
    for (const constraint of constraints) expect(migration).toContain(constraint);
  });

  /** Verifica la unicidad de las tablas puente pendientes. */
  it('keeps all remaining composite unique constraints', () => {
    const constraints = ['UQ_exam_routine_items_pair', 'UQ_exam_tariff_prices_pair', 'UQ_group_ht_items_pair'];
    for (const constraint of constraints) expect(migration).toContain(constraint);
  });

  /** Verifica el alcance nuclear por sucursal. */
  it('keeps branch scope on all core operations', () => {
    const constraints = ['FK_cash_register_laboratory_branch', 'FK_invoice_laboratory_branch', 'FK_patient_admissions_laboratory_branch', 'FK_patient_exams_laboratory_branch', 'FK_way_pay_laboratory_branch'];
    for (const constraint of constraints) expect(migration).toContain(constraint);
  });

  /** Conserva una unica migracion baseline. */
  it('keeps exactly one migration file', () => {
    const migrations = readdirSync('src/database/migrations').filter((name) => name.endsWith('.ts'));
    expect(migrations).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });
});
