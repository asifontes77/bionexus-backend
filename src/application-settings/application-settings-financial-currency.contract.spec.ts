import { readFileSync } from 'node:fs';
const read=(file:string)=>readFileSync(file,'utf8');
describe('Application Settings financial currency contract',()=>{
  const entity=read('src/application-settings/application-settings.entity.ts');
  const dto=read('src/application-settings/dto/update-application-settings.dto.ts');
  const service=read('src/application-settings/application-settings.service.ts');
  const migration=read('src/database/migrations/1789167600000-FinancialPrimaryCurrency.ts');
  it('persists VES or USD as financial presentation preference',()=>{for(const source of [entity,dto,service,migration])expect(source).toContain('financial_primary_currency');expect(service).toContain("financial_primary_currency:['VES','USD']")});
  it('defaults to VES and is reversible',()=>{expect(migration).toContain("DEFAULT 'VES'");expect(migration).toContain('DROP COLUMN financial_primary_currency')});
});
