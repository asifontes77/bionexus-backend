import { readFileSync } from 'node:fs';

describe('commercial plan model migration contract', () => {
  const migration = readFileSync('src/database/migrations/1793862001000-AddCommercialPlanModel.ts', 'utf8');
  const readiness = readFileSync('scripts/ops/BioNexus-SchemaReadiness.cjs', 'utf8');
  const migrationRunner = readFileSync('scripts/ops/Invoke-BioNexus-Migrations.ps1', 'utf8');

  it('adds typed duration snapshots and preserves billing_interval compatibility', () => {
    for (const table of ['platform_subscription_plans', 'platform_subscriptions', 'laboratory']) {
      expect(migration).toContain(`ALTER TABLE "${table}"`);
    }
    for (const column of ['plan_type', 'interval_unit', 'interval_count']) expect(migration).toContain(`"${column}"`);
    expect(migration).toContain(`CHECK ("plan_type" IN ('trial','paid'))`);
    expect(migration).toContain(`CHECK ("interval_unit" IN ('day','month','year'))`);
    expect(migration).toContain('CHECK ("interval_count" > 0)');
    expect(migration).not.toContain('DROP COLUMN "billing_interval"');
  });

  it('seeds the approved active 15-day USD trial without grace', () => {
    for (const value of ["'trial-15'", "'0.00'", "'USD'", "'trial'", "'day'", '15,0', "'{}'::jsonb", 'true']) {
      expect(migration).toContain(value);
    }
    expect(migration).toContain('ON CONFLICT (lower(btrim("code"))) DO NOTHING');
  });

  it('registers the migration and new laboratory snapshots in operational readiness', () => {
    expect(readiness).toContain('AddCommercialPlanModel1793862001000');
    for (const column of ['plan_type', 'interval_unit', 'interval_count']) expect(readiness).toContain(`'${column}'`);
    expect(migrationRunner).toContain('AddCommercialPlanModel1793862001000');
  });
});
