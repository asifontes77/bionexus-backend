import { readFileSync } from 'node:fs';

describe('platform subscription schema installation contract', () => {
  const migration = readFileSync(
    'src/database/migrations/1793862000000-AddPlatformSubscriptionCatalogAndBilling.ts',
    'utf8',
  );
  const freshInstall = readFileSync('src/database/commands/first-install.ts', 'utf8');
  const windowsInstaller = readFileSync('scripts/ops/Install-BioNexus-Environment.ps1', 'utf8');
  const databaseConfig = readFileSync('src/database/database.config.ts', 'utf8');

  it('adds plan catalog, immutable subscription snapshots, and append-only payments incrementally', () => {
    for (const table of [
      'platform_subscription_plans',
      'platform_subscriptions',
      'platform_subscription_payments',
      'platform_billing_audit_logs',
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
    expect(migration).toContain('"plan_grace_period_days" integer NOT NULL DEFAULT 0');
    expect(migration).toContain('"limits_benefits" jsonb NOT NULL');
    expect(migration).toContain('"proof_storage_key" text');
    expect(migration).toContain('TR_platform_subscription_payments_immutable');
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).toContain('REFERENCES "laboratory"("id")');
  });

  it('applies all timestamp migrations on first install and validates the final schema without modifying the baseline', () => {
    expect(freshInstall).toContain("runNpmScript('migration:run', environment)");
    expect(freshInstall).toContain('AddPlatformLaboratoryLifecycle1793847600000');
    expect(freshInstall).toContain('AddPlatformSubscriptionCatalogAndBilling1793862000000');
    expect(freshInstall).toContain('subscription_schema_ready');
    expect(windowsInstaller).toContain("npm run install:first");
    expect(windowsInstaller).toContain('AddPlatformSubscriptionCatalogAndBilling1793862000000');
    expect(windowsInstaller).toContain('subscriptionSchemaReady');
    expect(databaseConfig).toContain("join(srcDir, 'database', 'migrations'");
    expect(databaseConfig).toContain("*.{ts,js}");
  });

  it('keeps new schema delivery in migrations after the original compressed baseline', () => {
    const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
    expect(baseline).not.toContain('platform_subscription_plans');
    expect(baseline).not.toContain('platform_subscription_payments');
    expect(migration).toContain('AddPlatformSubscriptionCatalogAndBilling1793862000000');
  });
});
