import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommercialPlanModel1793862001000 implements MigrationInterface {
  readonly name = 'AddCommercialPlanModel1793862001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_subscription_plans"
        ADD COLUMN "plan_type" character varying(12),
        ADD COLUMN "interval_unit" character varying(12),
        ADD COLUMN "interval_count" integer;

      UPDATE "platform_subscription_plans"
      SET "plan_type"='paid',
          "interval_unit"=CASE "billing_interval" WHEN 'yearly' THEN 'year' ELSE 'month' END,
          "interval_count"=1;

      ALTER TABLE "platform_subscription_plans"
        ALTER COLUMN "plan_type" SET NOT NULL,
        ALTER COLUMN "interval_unit" SET NOT NULL,
        ALTER COLUMN "interval_count" SET NOT NULL,
        ADD CONSTRAINT "CK_platform_subscription_plans_type" CHECK ("plan_type" IN ('trial','paid')),
        ADD CONSTRAINT "CK_platform_subscription_plans_unit" CHECK ("interval_unit" IN ('day','month','year')),
        ADD CONSTRAINT "CK_platform_subscription_plans_count" CHECK ("interval_count" > 0);

      ALTER TABLE "platform_subscriptions"
        ADD COLUMN "plan_type" character varying(12),
        ADD COLUMN "interval_unit" character varying(12),
        ADD COLUMN "interval_count" integer;

      UPDATE "platform_subscriptions"
      SET "plan_type"=CASE WHEN "status"='trial' THEN 'trial' WHEN "status"='perpetual_free' THEN NULL ELSE 'paid' END,
          "interval_unit"=CASE "billing_interval" WHEN 'yearly' THEN 'year' WHEN 'monthly' THEN 'month' ELSE NULL END,
          "interval_count"=CASE WHEN "billing_interval" IS NULL THEN NULL ELSE 1 END;

      ALTER TABLE "platform_subscriptions"
        ADD CONSTRAINT "CK_platform_subscriptions_plan_type" CHECK ("plan_type" IS NULL OR "plan_type" IN ('trial','paid')),
        ADD CONSTRAINT "CK_platform_subscriptions_interval_unit" CHECK ("interval_unit" IS NULL OR "interval_unit" IN ('day','month','year')),
        ADD CONSTRAINT "CK_platform_subscriptions_interval_count" CHECK ("interval_count" IS NULL OR "interval_count" > 0);

      ALTER TABLE "laboratory"
        ADD COLUMN "plan_type" character varying(12),
        ADD COLUMN "interval_unit" character varying(12),
        ADD COLUMN "interval_count" integer;

      UPDATE "laboratory"
      SET "plan_type"=CASE WHEN "subscription_status"='trial' THEN 'trial' WHEN "subscription_status"='perpetual_free' THEN NULL WHEN "plan_id" IS NOT NULL THEN 'paid' ELSE NULL END,
          "interval_unit"=CASE "billing_interval" WHEN 'yearly' THEN 'year' WHEN 'monthly' THEN 'month' ELSE NULL END,
          "interval_count"=CASE WHEN "billing_interval" IS NULL THEN NULL ELSE 1 END;

      ALTER TABLE "laboratory"
        ADD CONSTRAINT "CK_laboratory_plan_type" CHECK ("plan_type" IS NULL OR "plan_type" IN ('trial','paid')),
        ADD CONSTRAINT "CK_laboratory_interval_unit" CHECK ("interval_unit" IS NULL OR "interval_unit" IN ('day','month','year')),
        ADD CONSTRAINT "CK_laboratory_interval_count" CHECK ("interval_count" IS NULL OR "interval_count" > 0);

      INSERT INTO "platform_subscription_plans"
        ("code","name","description","price","currency","billing_interval","plan_type","interval_unit","interval_count","grace_period_days","limits_benefits","is_active")
      VALUES
        ('trial-15','Trial 15 días','Prueba inicial de Bio Nexus por 15 días.','0.00','USD','monthly','trial','day',15,0,'{}'::jsonb,true)
      ON CONFLICT (lower(btrim("code"))) DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "platform_subscription_plans" p
      WHERE lower(btrim(p."code"))='trial-15'
        AND NOT EXISTS (SELECT 1 FROM "platform_subscriptions" s WHERE s."plan_id"=p."id")
        AND NOT EXISTS (SELECT 1 FROM "laboratory" l WHERE l."plan_id"=p."id");

      ALTER TABLE "laboratory"
        DROP CONSTRAINT "CK_laboratory_interval_count",
        DROP CONSTRAINT "CK_laboratory_interval_unit",
        DROP CONSTRAINT "CK_laboratory_plan_type",
        DROP COLUMN "interval_count",
        DROP COLUMN "interval_unit",
        DROP COLUMN "plan_type";

      ALTER TABLE "platform_subscriptions"
        DROP CONSTRAINT "CK_platform_subscriptions_interval_count",
        DROP CONSTRAINT "CK_platform_subscriptions_interval_unit",
        DROP CONSTRAINT "CK_platform_subscriptions_plan_type",
        DROP COLUMN "interval_count",
        DROP COLUMN "interval_unit",
        DROP COLUMN "plan_type";

      ALTER TABLE "platform_subscription_plans"
        DROP CONSTRAINT "CK_platform_subscription_plans_count",
        DROP CONSTRAINT "CK_platform_subscription_plans_unit",
        DROP CONSTRAINT "CK_platform_subscription_plans_type",
        DROP COLUMN "interval_count",
        DROP COLUMN "interval_unit",
        DROP COLUMN "plan_type";
    `);
  }
}
