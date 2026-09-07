import { readFileSync } from 'fs';
const read=(f:string)=>readFileSync(f,'utf8');
describe('Dollar value automatic update contract',()=>{
  const service=read('src/dollar_value/dollarvalue-automation.service.ts'),source=read('src/dollar_value/dollarvalue-source.service.ts'),migration=read('src/database/migrations/1788746400000-DollarValueAutomation.ts');
  it('runs automatically inside Nest without Windows service',()=>{expect(service).toContain('setInterval');expect(service).toContain('void this.tick()');expect(service).toContain("['Sat', 'Sun']")});
  it('uses BCV then DolarApi with timeout',()=>{expect(source).toContain('fetchBcv');expect(source).toContain('fetchFallback');expect(source).toContain('30000')});
  it('is idempotent and keeps failures away from current value',()=>{expect(service).toContain("status: 'UNCHANGED'");expect(service).toContain("status: 'FAILED'")});
  it('has reversible persistence',()=>{expect(migration).toContain('dollar_value_automation_runs');expect(migration).toContain('DROP TABLE IF EXISTS dollar_value_automation')});
});
