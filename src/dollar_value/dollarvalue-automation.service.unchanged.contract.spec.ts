import * as fs from 'node:fs';
import * as path from 'node:path';

describe('DollarValue UNCHANGED persistence contract', () => {
  const root = path.resolve(__dirname, '../..');
  const service = fs.readFileSync(path.join(root, 'src/dollar_value/dollarvalue-automation.service.ts'), 'utf8');

  it('removes the provisional run when the quotation is unchanged', () => {
    expect(service).toContain("if (result.status === 'UNCHANGED')");
    expect(service).toContain('await this.runRepo.remove(run)');
    expect(service).toContain("return { status: 'UNCHANGED'");
  });

  it('keeps UNCHANGED observability in config and timestamped application logs', () => {
    expect(service).toContain("last_status: 'UNCHANGED'");
    expect(service).toContain('Mensaje: Verificacion automatica finalizada sin cambios');
    expect(service).toContain('Estado: UNCHANGED');
    expect(service).toContain('Fuente: ${fetched.source}');
    expect(service).toContain('Valor: ${fetched.value}');
    expect(service).toContain('Fecha efectiva: ${fetched.effectiveDate}');
  });

  it('continues persisting INSERTED and FAILED executions', () => {
    expect(service).toContain("status: 'INSERTED'");
    expect(service).toContain('await this.runRepo.save(run)');
    expect(service).toContain("status: 'FAILED'");
  });
});
