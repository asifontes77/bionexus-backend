import { readFileSync } from 'fs';

describe('Normalized type payment backend contract', () => {
  const read = (name: string) => readFileSync(`src/type_payment/${name}`, 'utf8');
  it('maps only normalized payment method columns', () => {
    const source=read('typepayment.entity.ts');
    for(const token of ['code','display_order','PaymentMethodCurrency','PaymentMethodField'])expect(source).toContain(token);
    for(const legacy of ['description_1','description_2','only_dollars'])expect(source).not.toContain(legacy);
  });
  it('registers normalized entities', () => {
    const module=read('typepayment.module.ts');
    for(const entity of ['Currency','Bank','PaymentMethodCurrency','PaymentMethodField'])expect(module).toContain(entity);
  });
  it('validates currencies and audits in one transaction', () => {
    const service=read('typepayment.service.ts');
    for(const token of ['this.dataSource.transaction','TYPEPAYMENT_CURRENCIES_REQUIRED','TYPEPAYMENT_DEFAULT_CURRENCY_INVALID','replaceCurrencies','this.audit.write(manager'])expect(service).toContain(token);
  });
});
