import { readFileSync, readdirSync } from 'fs';

/** Protege el bloque relacional financiero, admisiones y alcance por laboratorio. */
describe('Financial and admissions relational normalization contract', () => {
  const migration = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');

  /** Verifica las relaciones funcionales del bloque. */
  it('keeps all financial and admissions foreign keys', () => {
    const constraints = ['FK_cash_register_user_id', 'FK_customer_accounts_receivable_client_id', 'FK_invoice_id_patients', 'FK_invoice_id_client', 'FK_invoice_id_users', 'FK_patient_admissions_client_id', 'FK_patient_admissions_tariff_id', 'FK_patient_admissions_delivery_id', 'FK_patient_admissions_user_id', 'FK_patient_exams_exam_catalog_id', 'FK_patient_exams_processed_id', 'FK_patient_exams_approved_id', 'FK_patient_profiles_source_admission_id', 'FK_patient_results_email_history_patient_id', 'FK_patient_results_email_history_requested_by_user_id', 'FK_patient_results_email_history_completed_by_user_id', 'FK_way_pay_id_patients'];
    for (const constraint of constraints) expect(migration).toContain(constraint);
  });

  /** Verifica los doce alcances obligatorios por laboratorio. */
  it('keeps all laboratory scope foreign keys', () => {
    const constraints = ['FK_cash_register_laboratory', 'FK_customer_accounts_receivable_laboratory', 'FK_invoice_laboratory', 'FK_invoice_items_laboratory', 'FK_patient_admissions_laboratory', 'FK_patient_exams_laboratory', 'FK_patient_profiles_laboratory', 'FK_patient_results_email_history_laboratory', 'FK_payment_item_field_values_laboratory', 'FK_payment_method_currencies_laboratory', 'FK_payment_method_fields_laboratory', 'FK_type_payment_laboratory'];
    for (const constraint of constraints) expect(migration).toContain(constraint);
  });

  /** Protege la unicidad de moneda por metodo y laboratorio. */
  it('keeps payment method currency uniqueness scoped by laboratory', () => {
    expect(migration).toContain('UQ_payment_method_currencies_laboratory_method_currency');
    expect(migration).toContain('UNIQUE ("laboratory_id", "payment_method_id", "currency_id")');
  });

  /** Evita migraciones incrementales durante la etapa baseline. */
  it('keeps exactly one migration file', () => {
    const migrations = readdirSync('src/database/migrations').filter((name) => name.endsWith('.ts'));
    expect(migrations).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });
});
