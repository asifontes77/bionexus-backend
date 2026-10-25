import { gunzipSync } from 'node:zlib';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BASELINE_GZIP_BASE64 = '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';

/** Primera y unica migracion para instalaciones nuevas de Bio Nexus. */
export class BioNexusBaseline1790366400000 implements MigrationInterface {
  readonly name = 'BioNexusBaseline1790366400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const existingTables = (await queryRunner.query(
      "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' AND table_name <> 'migrations'",
    )) as Array<{ tableCount: string | number }>;
    if (Number(existingTables[0]?.tableCount ?? 0) > 0) {
      throw new Error('BIONEXUS_BASELINE_REQUIRES_EMPTY_DATABASE');
    }

    const sql = gunzipSync(Buffer.from(BASELINE_GZIP_BASE64, 'base64')).toString('utf8');
    for (const statement of this.split(sql)) await queryRunner.query(statement);


    // BIO_NEXUS_SECURITY_RELATIONAL_NORMALIZATION
    // Las tablas puente ya usan PK compuesta, que garantiza la unicidad de cada par.
    await queryRunner.query(`
      ALTER TABLE "security_role_permissions"
        ADD CONSTRAINT "FK_security_role_permissions_role"
          FOREIGN KEY ("role_id") REFERENCES "security_roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_security_role_permissions_permission"
          FOREIGN KEY ("permission_id") REFERENCES "security_permissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_user_roles"
        ADD CONSTRAINT "FK_security_user_roles_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_security_user_roles_role"
          FOREIGN KEY ("role_id") REFERENCES "security_roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_user_permission_overrides"
        ADD CONSTRAINT "FK_security_user_permission_overrides_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_security_user_permission_overrides_permission"
          FOREIGN KEY ("permission_id") REFERENCES "security_permissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_audit_logs"
        ADD CONSTRAINT "FK_security_audit_logs_actor_user"
          FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    `);

    // BIO_NEXUS_FINANCIAL_ADMISSIONS_RELATIONAL_NORMALIZATION
    await queryRunner.query(`
      ALTER TABLE "cash_register" ADD COLUMN "laboratory_id" integer;
      UPDATE "cash_register" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "cash_register" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "cash_register" ADD CONSTRAINT "FK_cash_register_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "customer_accounts_receivable" ADD COLUMN "laboratory_id" integer;
      UPDATE "customer_accounts_receivable" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "customer_accounts_receivable" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "customer_accounts_receivable" ADD CONSTRAINT "FK_customer_accounts_receivable_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "invoice" ADD COLUMN "laboratory_id" integer;
      UPDATE "invoice" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "invoice" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "invoice" ADD CONSTRAINT "FK_invoice_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "invoice_items" ADD COLUMN "laboratory_id" integer;
      UPDATE "invoice_items" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "invoice_items" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "invoice_items" ADD CONSTRAINT "FK_invoice_items_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "patient_admissions" ADD COLUMN "laboratory_id" integer;
      UPDATE "patient_admissions" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "patient_admissions" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "patient_admissions" ADD CONSTRAINT "FK_patient_admissions_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "patient_exams" ADD COLUMN "laboratory_id" integer;
      UPDATE "patient_exams" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "patient_exams" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "patient_exams" ADD CONSTRAINT "FK_patient_exams_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "patient_profiles" ADD COLUMN "laboratory_id" integer;
      UPDATE "patient_profiles" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "patient_profiles" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "patient_profiles" ADD CONSTRAINT "FK_patient_profiles_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "patient_results_email_history" ADD COLUMN "laboratory_id" integer;
      UPDATE "patient_results_email_history" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "patient_results_email_history" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "patient_results_email_history" ADD CONSTRAINT "FK_patient_results_email_history_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "payment_item_field_values" ADD COLUMN "laboratory_id" integer;
      UPDATE "payment_item_field_values" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "payment_item_field_values" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "payment_item_field_values" ADD CONSTRAINT "FK_payment_item_field_values_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "payment_method_currencies" ADD COLUMN "laboratory_id" integer;
      UPDATE "payment_method_currencies" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "payment_method_currencies" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "payment_method_currencies" ADD CONSTRAINT "FK_payment_method_currencies_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "payment_method_fields" ADD COLUMN "laboratory_id" integer;
      UPDATE "payment_method_fields" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "payment_method_fields" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "payment_method_fields" ADD CONSTRAINT "FK_payment_method_fields_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "type_payment" ADD COLUMN "laboratory_id" integer;
      UPDATE "type_payment" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "type_payment" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "type_payment" ADD CONSTRAINT "FK_type_payment_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "cash_register" ADD CONSTRAINT "FK_cash_register_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "customer_accounts_receivable" ADD CONSTRAINT "FK_customer_accounts_receivable_client_id" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "invoice" ADD CONSTRAINT "FK_invoice_id_patients" FOREIGN KEY ("id_patients") REFERENCES "patient_admissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "invoice" ADD CONSTRAINT "FK_invoice_id_client" FOREIGN KEY ("id_client") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "invoice" ADD CONSTRAINT "FK_invoice_id_users" FOREIGN KEY ("id_users") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "patient_admissions" ADD CONSTRAINT "FK_patient_admissions_client_id" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "patient_admissions" ADD CONSTRAINT "FK_patient_admissions_tariff_id" FOREIGN KEY ("tariff_id") REFERENCES "tariffs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "patient_admissions" ADD CONSTRAINT "FK_patient_admissions_delivery_id" FOREIGN KEY ("delivery_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "patient_admissions" ADD CONSTRAINT "FK_patient_admissions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "patient_exams" ADD CONSTRAINT "FK_patient_exams_exam_catalog_id" FOREIGN KEY ("exam_catalog_id") REFERENCES "exam_catalog"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "patient_exams" ADD CONSTRAINT "FK_patient_exams_processed_id" FOREIGN KEY ("processed_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "patient_exams" ADD CONSTRAINT "FK_patient_exams_approved_id" FOREIGN KEY ("approved_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "patient_profiles" ADD CONSTRAINT "FK_patient_profiles_source_admission_id" FOREIGN KEY ("source_admission_id") REFERENCES "patient_admissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "patient_results_email_history" ADD CONSTRAINT "FK_patient_results_email_history_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patient_admissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "patient_results_email_history" ADD CONSTRAINT "FK_patient_results_email_history_requested_by_user_id" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "patient_results_email_history" ADD CONSTRAINT "FK_patient_results_email_history_completed_by_user_id" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "way_pay" ADD CONSTRAINT "FK_way_pay_id_patients" FOREIGN KEY ("id_patients") REFERENCES "patient_admissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "payment_method_currencies"
        ADD CONSTRAINT "UQ_payment_method_currencies_laboratory_method_currency"
        UNIQUE ("laboratory_id", "payment_method_id", "currency_id");
    `);

    // BIO_NEXUS_DATABASE_NORMALIZATION_FINAL
    await queryRunner.query(`
      ALTER TABLE "antibiotic" ADD COLUMN "laboratory_id" integer;
      UPDATE "antibiotic" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "antibiotic" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "antibiotic" ADD CONSTRAINT "FK_antibiotic_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "banks" ADD COLUMN "laboratory_id" integer;
      UPDATE "banks" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "banks" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "banks" ADD CONSTRAINT "FK_banks_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "client" ADD COLUMN "laboratory_id" integer;
      UPDATE "client" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "client" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "client" ADD CONSTRAINT "FK_client_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "currencies" ADD COLUMN "laboratory_id" integer;
      UPDATE "currencies" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "currencies" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "currencies" ADD CONSTRAINT "FK_currencies_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "document_drafts" ADD COLUMN "laboratory_id" integer;
      UPDATE "document_drafts" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "document_drafts" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "document_drafts" ADD CONSTRAINT "FK_document_drafts_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "dollar_value" ADD COLUMN "laboratory_id" integer;
      UPDATE "dollar_value" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "dollar_value" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "dollar_value" ADD CONSTRAINT "FK_dollar_value_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "dollar_value_automation" ADD COLUMN "laboratory_id" integer;
      UPDATE "dollar_value_automation" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "dollar_value_automation" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "dollar_value_automation" ADD CONSTRAINT "FK_dollar_value_automation_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "dollar_value_automation_runs" ADD COLUMN "laboratory_id" integer;
      UPDATE "dollar_value_automation_runs" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "dollar_value_automation_runs" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "dollar_value_automation_runs" ADD CONSTRAINT "FK_dollar_value_automation_runs_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "exam_catalog" ADD COLUMN "laboratory_id" integer;
      UPDATE "exam_catalog" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "exam_catalog" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "exam_catalog" ADD CONSTRAINT "FK_exam_catalog_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "exam_group" ADD COLUMN "laboratory_id" integer;
      UPDATE "exam_group" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "exam_group" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "exam_group" ADD CONSTRAINT "FK_exam_group_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "exam_routine_items" ADD COLUMN "laboratory_id" integer;
      UPDATE "exam_routine_items" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "exam_routine_items" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "exam_routine_items" ADD CONSTRAINT "FK_exam_routine_items_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "exam_routines" ADD COLUMN "laboratory_id" integer;
      UPDATE "exam_routines" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "exam_routines" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "exam_routines" ADD CONSTRAINT "FK_exam_routines_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "exam_tariff_prices" ADD COLUMN "laboratory_id" integer;
      UPDATE "exam_tariff_prices" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "exam_tariff_prices" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "exam_tariff_prices" ADD CONSTRAINT "FK_exam_tariff_prices_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "group_ht" ADD COLUMN "laboratory_id" integer;
      UPDATE "group_ht" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "group_ht" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "group_ht" ADD CONSTRAINT "FK_group_ht_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "group_ht_items" ADD COLUMN "laboratory_id" integer;
      UPDATE "group_ht_items" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "group_ht_items" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "group_ht_items" ADD CONSTRAINT "FK_group_ht_items_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "list_germs" ADD COLUMN "laboratory_id" integer;
      UPDATE "list_germs" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "list_germs" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "list_germs" ADD CONSTRAINT "FK_list_germs_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "parasiticforms" ADD COLUMN "laboratory_id" integer;
      UPDATE "parasiticforms" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "parasiticforms" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "parasiticforms" ADD CONSTRAINT "FK_parasiticforms_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "sample_type" ADD COLUMN "laboratory_id" integer;
      UPDATE "sample_type" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "sample_type" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "sample_type" ADD CONSTRAINT "FK_sample_type_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_audit_logs" ADD COLUMN "laboratory_id" integer;
      UPDATE "security_audit_logs" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "security_audit_logs" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "security_audit_logs" ADD CONSTRAINT "FK_security_audit_logs_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_role_permissions" ADD COLUMN "laboratory_id" integer;
      UPDATE "security_role_permissions" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "security_role_permissions" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "security_role_permissions" ADD CONSTRAINT "FK_security_role_permissions_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_roles" ADD COLUMN "laboratory_id" integer;
      UPDATE "security_roles" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "security_roles" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "security_roles" ADD CONSTRAINT "FK_security_roles_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_user_permission_overrides" ADD COLUMN "laboratory_id" integer;
      UPDATE "security_user_permission_overrides" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "security_user_permission_overrides" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "security_user_permission_overrides" ADD CONSTRAINT "FK_security_user_permission_overrides_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "security_user_roles" ADD COLUMN "laboratory_id" integer;
      UPDATE "security_user_roles" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "security_user_roles" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "security_user_roles" ADD CONSTRAINT "FK_security_user_roles_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "special_test_items" ADD COLUMN "laboratory_id" integer;
      UPDATE "special_test_items" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "special_test_items" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "special_test_items" ADD CONSTRAINT "FK_special_test_items_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "special_test_lab" ADD COLUMN "laboratory_id" integer;
      UPDATE "special_test_lab" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "special_test_lab" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "special_test_lab" ADD CONSTRAINT "FK_special_test_lab_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "tariffs" ADD COLUMN "laboratory_id" integer;
      UPDATE "tariffs" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "tariffs" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "tariffs" ADD CONSTRAINT "FK_tariffs_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "tax" ADD COLUMN "laboratory_id" integer;
      UPDATE "tax" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "tax" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "tax" ADD CONSTRAINT "FK_tax_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "users" ADD COLUMN "laboratory_id" integer;
      UPDATE "users" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "users" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "way_pay" ADD COLUMN "laboratory_id" integer;
      UPDATE "way_pay" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "way_pay" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "way_pay" ADD CONSTRAINT "FK_way_pay_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "way_pay_items" ADD COLUMN "laboratory_id" integer;
      UPDATE "way_pay_items" SET "laboratory_id" = 1 WHERE "laboratory_id" IS NULL;
      ALTER TABLE "way_pay_items" ALTER COLUMN "laboratory_id" SET NOT NULL;
      ALTER TABLE "way_pay_items" ADD CONSTRAINT "FK_way_pay_items_laboratory" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "document_definitions" ADD CONSTRAINT "FK_document_definitions_laboratory_id" FOREIGN KEY ("laboratory_id") REFERENCES "laboratory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "document_definitions" ADD CONSTRAINT "FK_document_definitions_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "document_definitions" ADD CONSTRAINT "FK_document_definitions_updated_by_user_id" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "document_drafts" ADD CONSTRAINT "FK_document_drafts_document_id" FOREIGN KEY ("document_id") REFERENCES "document_definitions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "document_drafts" ADD CONSTRAINT "FK_document_drafts_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "document_drafts" ADD CONSTRAINT "FK_document_drafts_updated_by_user_id" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "dollar_value_automation_runs" ADD CONSTRAINT "FK_dollar_value_automation_runs_requested_by_user_id" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      ALTER TABLE "exam_catalog" ADD CONSTRAINT "FK_exam_catalog_tax_id" FOREIGN KEY ("tax_id") REFERENCES "tax"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "way_pay" ADD CONSTRAINT "FK_way_pay_id_users" FOREIGN KEY ("id_users") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "way_pay" ADD CONSTRAINT "FK_way_pay_id_client" FOREIGN KEY ("id_client") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE "exam_routine_items" ADD CONSTRAINT "UQ_exam_routine_items_pair" UNIQUE ("routine_id", "exam_catalog_id");
      ALTER TABLE "exam_tariff_prices" ADD CONSTRAINT "UQ_exam_tariff_prices_pair" UNIQUE ("tariff_id", "exam_catalog_id");
      ALTER TABLE "group_ht_items" ADD CONSTRAINT "UQ_group_ht_items_pair" UNIQUE ("groupHtId", "examId");
      ALTER TABLE "cash_register" ADD COLUMN "laboratory_branch_id" integer;
      UPDATE "cash_register" t SET "laboratory_branch_id" = b."id" FROM "laboratory_branches" b WHERE b."laboratory_id" = t."laboratory_id" AND b."is_main" = true AND t."laboratory_branch_id" IS NULL;
      ALTER TABLE "cash_register" ALTER COLUMN "laboratory_branch_id" SET NOT NULL;
      ALTER TABLE "cash_register" ADD CONSTRAINT "FK_cash_register_laboratory_branch" FOREIGN KEY ("laboratory_branch_id") REFERENCES "laboratory_branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "invoice" ADD COLUMN "laboratory_branch_id" integer;
      UPDATE "invoice" t SET "laboratory_branch_id" = b."id" FROM "laboratory_branches" b WHERE b."laboratory_id" = t."laboratory_id" AND b."is_main" = true AND t."laboratory_branch_id" IS NULL;
      ALTER TABLE "invoice" ALTER COLUMN "laboratory_branch_id" SET NOT NULL;
      ALTER TABLE "invoice" ADD CONSTRAINT "FK_invoice_laboratory_branch" FOREIGN KEY ("laboratory_branch_id") REFERENCES "laboratory_branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "patient_admissions" ADD COLUMN "laboratory_branch_id" integer;
      UPDATE "patient_admissions" t SET "laboratory_branch_id" = b."id" FROM "laboratory_branches" b WHERE b."laboratory_id" = t."laboratory_id" AND b."is_main" = true AND t."laboratory_branch_id" IS NULL;
      ALTER TABLE "patient_admissions" ALTER COLUMN "laboratory_branch_id" SET NOT NULL;
      ALTER TABLE "patient_admissions" ADD CONSTRAINT "FK_patient_admissions_laboratory_branch" FOREIGN KEY ("laboratory_branch_id") REFERENCES "laboratory_branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "patient_exams" ADD COLUMN "laboratory_branch_id" integer;
      UPDATE "patient_exams" t SET "laboratory_branch_id" = b."id" FROM "laboratory_branches" b WHERE b."laboratory_id" = t."laboratory_id" AND b."is_main" = true AND t."laboratory_branch_id" IS NULL;
      ALTER TABLE "patient_exams" ALTER COLUMN "laboratory_branch_id" SET NOT NULL;
      ALTER TABLE "patient_exams" ADD CONSTRAINT "FK_patient_exams_laboratory_branch" FOREIGN KEY ("laboratory_branch_id") REFERENCES "laboratory_branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "way_pay" ADD COLUMN "laboratory_branch_id" integer;
      UPDATE "way_pay" t SET "laboratory_branch_id" = b."id" FROM "laboratory_branches" b WHERE b."laboratory_id" = t."laboratory_id" AND b."is_main" = true AND t."laboratory_branch_id" IS NULL;
      ALTER TABLE "way_pay" ALTER COLUMN "laboratory_branch_id" SET NOT NULL;
      ALTER TABLE "way_pay" ADD CONSTRAINT "FK_way_pay_laboratory_branch" FOREIGN KEY ("laboratory_branch_id") REFERENCES "laboratory_branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

    `);


    // BIO_NEXUS_MODULAR_PROVISIONING_FOUNDATION
    await queryRunner.query(`
      CREATE TABLE "application_modules" (
        "id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        "code" character varying(100) NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CK_application_modules_code_not_blank" CHECK (btrim("code") <> ''),
        CONSTRAINT "CK_application_modules_name_not_blank" CHECK (btrim("name") <> '')
      );

      CREATE UNIQUE INDEX "UQ_application_modules_code_normalized"
        ON "application_modules" (upper(btrim("code")));

      INSERT INTO "application_modules" ("code", "name", "display_order")
      SELECT DISTINCT upper(btrim("module")), initcap(replace(btrim("module"), '_', ' ')),
             dense_rank() OVER (ORDER BY upper(btrim("module")))
      FROM "security_permissions"
      WHERE btrim("module") <> ''
      ON CONFLICT DO NOTHING;

      CREATE TABLE "laboratory_modules" (
        "laboratory_id" integer NOT NULL,
        "module_id" integer NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "enabled_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "disabled_at" timestamp with time zone,
        "configuration" jsonb,
        CONSTRAINT "PK_laboratory_modules" PRIMARY KEY ("laboratory_id", "module_id"),
        CONSTRAINT "FK_laboratory_modules_laboratory" FOREIGN KEY ("laboratory_id")
          REFERENCES "laboratory"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_laboratory_modules_module" FOREIGN KEY ("module_id")
          REFERENCES "application_modules"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "CK_laboratory_modules_disabled_at" CHECK ("is_enabled" OR "disabled_at" IS NOT NULL)
      );

      CREATE INDEX "IX_laboratory_modules_enabled"
        ON "laboratory_modules" ("laboratory_id", "is_enabled");
    `);

    // BIO_NEXUS_LABORATORY_PROVISIONING_CONTRACT
    await queryRunner.query(`
      ALTER TABLE "laboratory" ALTER COLUMN "phone_1" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "phone_2" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "email" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "logo" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "url" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "mask_phone" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "voucher_format" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "rows_description_invoices" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "head_html" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "body_html" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "page_html" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "workshee_format" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "printer_type" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "printer_interface" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "license" DROP NOT NULL;
      ALTER TABLE "laboratory" ALTER COLUMN "receipt_format" DROP NOT NULL;
      ALTER TABLE "laboratory" ADD CONSTRAINT "CK_laboratory_rif_not_blank" CHECK (btrim("rif") <> '');
      ALTER TABLE "laboratory" ADD CONSTRAINT "CK_laboratory_name_not_blank" CHECK (btrim("name") <> '');
      ALTER TABLE "laboratory" ADD CONSTRAINT "CK_laboratory_business_name_not_blank" CHECK (btrim("business_name") <> '');
      ALTER TABLE "laboratory" ADD CONSTRAINT "CK_laboratory_address_not_blank" CHECK (btrim("address") <> '');
      CREATE UNIQUE INDEX "UQ_laboratory_rif_normalized" ON "laboratory" (upper(btrim("rif")));
    `);
}

  async down(): Promise<void> {
    throw new Error('BIONEXUS_BASELINE_DOWN_NOT_AVAILABLE');
  }

  private split(sql: string): string[] {
    const statements: string[] = [];
    const lines = sql.replace(/^\uFEFF/, '').split(/\r?\n/);
    let delimiter = ';';
    let buffer = '';
    for (const line of lines) {
      const directive = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
      if (directive) {
        if (buffer.trim()) throw new Error('BIONEXUS_BASELINE_DELIMITER_WITH_PENDING_SQL');
        delimiter = directive[1];
        continue;
      }
      if (!buffer.trim() && (!line.trim() || /^\s*--/.test(line))) continue;
      buffer += line + "\n";
      const trimmed = buffer.trimEnd();
      if (!trimmed.endsWith(delimiter)) continue;
      const statement = trimmed.slice(0, -delimiter.length).trim();
      if (statement) statements.push(statement);
      buffer = '';
    }
    if (buffer.trim()) throw new Error('BIONEXUS_BASELINE_INCOMPLETE_SQL');
    return statements;
  }
}
