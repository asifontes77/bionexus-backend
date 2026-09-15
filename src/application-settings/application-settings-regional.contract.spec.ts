import * as fs from 'fs';
import * as path from 'path';
const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');
describe('Application Settings regional formats contract',()=>{
  const entity=read('src/application-settings/application-settings.entity.ts');
  const dto=read('src/application-settings/dto/update-application-settings.dto.ts');
  const service=read('src/application-settings/application-settings.service.ts');
  const migration=read('src/database/migrations/1789258800000-CurrencySingleSourceOfTruth.ts');
  const active=entity+dto+service;
  it('keeps non-monetary regional preferences',()=>{for(const field of ['locale','time_zone','date_format','hour_cycle','first_day_of_week','decimal_separator'])expect(active).toContain(field)});
  it('removes duplicated monetary settings',()=>{for(const field of ['currency_code','currency_symbol','currency_symbol_position','monetary_decimals'])expect(active).not.toContain(field)});
  it('validates controlled regional values',()=>expect(service).toContain('APPLICATION_SETTINGS_REGIONAL_VALUE_INVALID'));
  it('retires duplicated columns reversibly',()=>{for(const field of ['currency_code','currency_symbol','currency_symbol_position','monetary_decimals'])expect(migration).toContain('DROP COLUMN '+field);expect(migration).not.toContain('DROP COLUMN decimal_separator')});
});