import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');

describe('Tariffs canonical API contract', () => {
  const controller = read('src/tariffs/tariffs.controller.ts');
  const service = read('src/tariffs/tariffs.service.ts');
  const module = read('src/tariffs/tariffs.module.ts');
  const migration = read(
    'src/database/migrations/1789002000000-TariffPermissions.ts',
  );

  it('protege las rutas con cinco permisos separados', () => {
    for (const code of [
      'tariffs.read',
      'tariffs.create',
      'tariffs.update',
      'tariffs.change-status',
      'tariffs.set-default',
    ])
      expect(controller + migration).toContain(code);
    expect(controller).toContain("@Controller('tariffs')");
  });

  it('mantiene USD, tarifas ilimitadas y estadisticas de precios', () => {
    expect(service).toContain('baseCurrencyId');expect(service).toContain('currencyId: await this.baseCurrencyId(manager)');
    expect(service).toContain('configuredPriceCount');
    expect(service).not.toContain('cost1');
    expect(service).not.toContain('cost6');
  });

  it('protege predeterminada y ultima tarifa activa', () => {
    expect(service).toContain('TARIFF_DEFAULT_CANNOT_BE_DEACTIVATED');
    expect(service).toContain('TARIFF_LAST_ACTIVE_CANNOT_BE_DEACTIVATED');
    expect(service).toContain('TARIFF_DEFAULT_MUST_BE_ACTIVE');
    expect(service).toContain("setLock('pessimistic_write')");
  });

  it('usa transacciones, auditoria y validaciones controladas', () => {
    expect(service).toContain('this.dataSource.transaction(action)');
    expect(service).toContain('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    for (const action of [
      'tariff.created',
      'tariff.updated',
      'tariff.activated',
      'tariff.deactivated',
      'tariff.default-set',
    ])
      expect(service).toContain(action);
    expect(module).toContain('AuthorizationModule');
    expect(module).toContain('SecurityAuditModule');
  });
});
