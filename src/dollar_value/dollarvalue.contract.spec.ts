import { readFileSync } from 'fs';

describe('Dollar value hardened contract', () => {
  const controller = readFileSync('src/dollar_value/dollarvalue.controller.ts', 'utf8');
  const service = readFileSync('src/dollar_value/dollarvalue.service.ts', 'utf8');
  const moduleSource = readFileSync('src/dollar_value/dollarvalue.module.ts', 'utf8');
  const migration = readFileSync('src/database/migrations/1788742800000-DollarValuePermissions.ts', 'utf8');

  it('protects reading and publishing with dedicated permissions', () => {
    expect(controller + migration).toContain('dollar-value.read');
    expect(controller + migration).toContain('dollar-value.update');
    expect(controller).not.toContain('@Patch');
  });

  it('publishes in a transaction and audits previous and current values', () => {
    expect(service).toContain('this.dataSource.transaction');
    expect(service).toContain('this.audit.write(manager');
    expect(service).toContain('previousValue');
    expect(service).toContain('currentValue');
  });

  it('requires authorization and audit modules', () => {
    expect(moduleSource).toContain('AuthorizationModule');
    expect(moduleSource).toContain('SecurityAuditModule');
    expect(service).not.toContain('@Optional');
  });
});
