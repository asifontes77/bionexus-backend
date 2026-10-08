import * as fs from 'node:fs';
import * as path from 'node:path';
describe('DollarValue date-only consumers',()=>{
 const root=path.resolve(__dirname,'../..');
 const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
 it('audits effective dates as YYYY-MM-DD strings',()=>{
  const source=read('src/dollar_value/dollarvalue.service.ts');
  expect(source).toContain('previousDate: previous?.date ?? null');
  expect(source).toContain('currentDate: current.date');
  expect(source).not.toContain('date.toISOString()');
 });
 it('validates the admission-close exchange-rate date as date-only',()=>{
  const source=read('src/patient-admission-close/patient-admission-close-rate.resolver.ts');
  expect(source).toContain("typeof record.date !== 'string'");
  expect(source).toContain('\\d{4}-\\d{2}-\\d{2}');
  expect(source).not.toContain('record.date instanceof Date');
 });
});
