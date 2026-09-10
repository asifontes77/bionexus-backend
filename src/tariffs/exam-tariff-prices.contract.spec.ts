import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');

describe('Dynamic exam tariff prices contract', () => {
  const controller = read('src/tariffs/exam-tariff-prices.controller.ts');
  const service = read('src/tariffs/exam-tariff-prices.service.ts');
  const module = read('src/tariffs/tariffs.module.ts');

  it('expone lectura y reemplazo protegidos', () => {
    expect(controller).toContain("@Controller('exam-tariff-prices')");
    expect(controller).toContain("@RequirePermissions('tariffs.read')");
    expect(controller).toContain("@RequirePermissions('tariffs.update')");
    expect(controller).toContain("@Put(':examCatalogId')");
  });

  it('usa la tabla normalizada como fuente canonica', () => {
    expect(service).toContain('ExamTariffPrice');
    expect(service).toContain('priceRepository');
    expect(service).toContain("currencyCode: 'USD'");
  });

  it('sincroniza temporalmente solo LEGACY_1 a LEGACY_6', () => {
    expect(service).toContain('/^LEGACY_([1-6])$/');
    expect(service).toContain('legacy-cost1-cost6-synchronized');
    expect(service).toContain('exam[field] = value.price');
  });

  it('protege escrituras con transaccion, bloqueo y auditoria', () => {
    expect(service).toContain('this.dataSource.transaction');
    expect(service).toContain("setLock('pessimistic_write')");
    expect(service).toContain("action: 'exam-tariff-prices.replaced'");
    expect(module).toContain('ExamTariffPricesService');
    expect(module).toContain('ExamTariffPricesController');
  });
});
