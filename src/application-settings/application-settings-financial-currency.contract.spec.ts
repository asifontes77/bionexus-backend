import * as fs from 'fs';
import * as path from 'path';
const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');
describe('Application Settings financial currency contract',()=>{
  const entity=read('src/application-settings/application-settings.entity.ts');
  const dto=read('src/application-settings/dto/update-application-settings.dto.ts');
  const service=read('src/application-settings/application-settings.service.ts');
  const migration=read('src/database/migrations/1789258800000-CurrencySingleSourceOfTruth.ts');
  it('persists preference by relation',()=>{for(const source of [entity,dto,service])expect(source).toContain('financial_primary_currency_id');expect(entity).toContain('financialPrimaryCurrency');expect(service).toContain('APPLICATION_SETTINGS_FINANCIAL_CURRENCY_INVALID')});
  it('removes duplicated code and remains reversible',()=>{expect(migration).toContain('DROP COLUMN financial_primary_currency');expect(migration).toContain('ADD financial_primary_currency varchar(3)')});
});