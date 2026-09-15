import { readFileSync } from 'node:fs';
const read=(file:string)=>readFileSync(file,'utf8');
describe('Currency single source active contracts',()=>{
  const settings=read('src/application-settings/application-settings.entity.ts')+read('src/application-settings/application-settings.service.ts')+read('src/application-settings/dto/update-application-settings.dto.ts');
  const tariffs=read('src/tariffs/tariff.entity.ts')+read('src/tariffs/tariffs.service.ts');
  it('removes duplicated active settings fields',()=>{for(const field of ['currency_code','currency_symbol','currency_symbol_position','base_currency_symbol','base_currency_symbol_position','monetary_decimals'])expect(settings).not.toContain(field);expect(settings).toContain('financial_primary_currency_id');expect(settings).toContain('financialPrimaryCurrency');});
  it('normalizes tariffs by currency relation',()=>{expect(tariffs).toContain("name: 'currency_id'");expect(tariffs).toContain('currency: Currency');expect(tariffs).not.toContain("name: 'currency_code'");expect(tariffs).toContain('baseCurrencyId');});
});
