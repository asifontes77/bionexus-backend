import { readFileSync } from 'fs';
describe('Normalized payment totals',()=>{const source=readFileSync('src/way_pay/waypay.service.ts','utf8');it('uses normalized amount columns',()=>{expect(source).toContain('localEquivalentAmount');expect(source).toContain('baseAmount');expect(source).not.toContain('amountDollar');});});
