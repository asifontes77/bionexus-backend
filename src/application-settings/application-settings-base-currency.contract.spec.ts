import * as fs from 'fs';
import * as path from 'path';
const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');
describe('Application Settings base currency presentation',()=>{
  const active=read('src/application-settings/application-settings.entity.ts')+read('src/application-settings/dto/update-application-settings.dto.ts')+read('src/application-settings/application-settings.service.ts');
  const currency=read('src/type_payment/currency.entity.ts');
  const migration=read('src/database/migrations/1789258800000-CurrencySingleSourceOfTruth.ts');
  it('uses currencies as source of truth',()=>{expect(active).not.toContain('base_currency_symbol');expect(active).not.toContain('base_currency_symbol_position');expect(currency).toContain('symbol');expect(currency).toContain('symbol_position');expect(migration).toContain('currency.is_base = 1')});
  it('remains reversible',()=>{expect(migration).toContain('ADD base_currency_symbol');expect(migration).toContain('ADD base_currency_symbol_position')});
});