import { readFileSync } from 'node:fs';
const read=(file:string)=>readFileSync(file,'utf8');
describe('Application Settings base currency presentation',()=>{
  const all=read('src/application-settings/application-settings.entity.ts')+read('src/application-settings/dto/update-application-settings.dto.ts')+read('src/application-settings/application-settings.service.ts')+read('src/database/migrations/1789171200000-BaseCurrencyPresentation.ts');
  it('persists symbol and position independently',()=>{expect(all).toContain('base_currency_symbol');expect(all).toContain('base_currency_symbol_position');expect(all).toContain("DEFAULT 'USD'");expect(all).toContain("['before','after']")});
  it('is reversible',()=>{expect(all).toContain('DROP COLUMN base_currency_symbol_position');expect(all).toContain('DROP COLUMN base_currency_symbol')});
});