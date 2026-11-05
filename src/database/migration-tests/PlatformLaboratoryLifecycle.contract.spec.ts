import { readFileSync } from 'fs';

describe('Platform laboratory lifecycle baseline contract', () => {
  const migration = readFileSync('src/database/migrations/1793847600000-AddPlatformLaboratoryLifecycle.ts', 'utf8');
  const provisioning = readFileSync('src/platform/platform-provisioning.service.ts', 'utf8');

  it('keeps Cloud as the only current deployment mode and persists the approved lifecycle fields', () => {
    for (const column of [
      'service_mode',
      'plan_code',
      'subscription_status',
      'service_starts_at',
      'service_expires_at',
      'grace_until',
      'perpetual_free_reason',
      'perpetual_free_granted_at',
      'perpetual_free_granted_by',
      'suspension_reason',
      'suspended_at',
      'commercial_notes',
      'is_active',
    ]) {
      expect(migration).toContain(`"${column}"`);
    }
    expect(migration).toContain(`CHECK ("service_mode" = 'cloud')`);
    expect(migration).toContain("'perpetual_free'");
  });

  it('creates permanent grants with server-owned audit identity and does not add expiry enforcement', () => {
    expect(provisioning).toContain("CASE WHEN $9='perpetual_free' THEN now()");
    expect(provisioning).toContain("CASE WHEN $9='perpetual_free' THEN $14");
    expect(provisioning).not.toContain('LicenseService');
  });

  it('preserves platform-owner laboratory audit history independently from tenant deletion', () => {
    expect(migration).toContain('CREATE TABLE "platform_laboratory_audit_logs"');
    expect(migration).toContain('FOREIGN KEY ("platform_owner_id") REFERENCES "platform_owners"("id")');
    expect(migration).not.toMatch(/platform_laboratory_audit_logs[\s\S]*?REFERENCES "laboratory"/);
    expect(provisioning).toContain("'platform.laboratory.created'");
  });
});
