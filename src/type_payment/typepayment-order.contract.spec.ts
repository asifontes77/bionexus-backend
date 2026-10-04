import { readFileSync } from 'node:fs';

describe('TypePayment automatic display order contract', () => {
  const frontend = readFileSync('../Bio Nexus Frontend/src/components/typepayment/TypePaymentDialog.vue', 'utf8');
  const service = readFileSync('src/type_payment/typepayment.service.ts', 'utf8');

  it('does not send INT_MAX from the create dialog', () => {
    expect(frontend).not.toContain('2147483647');
    expect(frontend).toContain("displayOrder:mode.value==='create'?0");
  });

  it('calculates the next persisted order inside the Backend transaction', () => {
    expect(service).toContain('const displayOrder=await this.nextDisplayOrder(repository)');
    expect(service).toContain("setLock('pessimistic_write')");
    expect(service).toContain("COALESCE(MAX(typePayment.displayOrder),0)");
    expect(service).toContain('Number(row?.value??0)+10');
    expect(service).toContain('repository.create({code:input.code,description:input.description,displayOrder,annulled:false})');
  });

  it('does not trust the create payload order when persisting', () => {
    expect(service).not.toContain('repository.create({code:input.code,description:input.description,displayOrder:input.displayOrder,annulled:false})');
  });
});
