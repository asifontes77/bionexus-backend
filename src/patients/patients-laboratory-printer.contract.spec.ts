import { readFileSync } from 'node:fs';

describe('Patients laboratory printer contract', () => {
  const source = readFileSync('src/patients/patients.service.ts', 'utf8');

  it('uses the valid length property for printer_interface', () => {
    expect(source).toContain('printer_interface.length');
    expect(source).not.toContain('printer_interface.legth');
  });
});