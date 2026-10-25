import { readFileSync, readdirSync } from 'fs';

/** Protege el contrato minimo para aprovisionar laboratorios por modulos. */
describe('Laboratory provisioning contract', () => {
  const migration = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  const optionalColumns = [
    'phone_1', 'phone_2', 'email', 'logo', 'url', 'mask_phone', 'voucher_format',
    'rows_description_invoices', 'head_html', 'body_html', 'page_html', 'workshee_format',
    'printer_type', 'printer_interface', 'license', 'receipt_format',
  ];

  /** Mantiene como obligatorios solo los datos nucleares. */
  it('keeps the laboratory core fields protected', () => {
    for (const name of ['rif', 'name', 'business_name', 'address']) {
      expect(migration).toContain(`CK_laboratory_${name}_not_blank`);
    }
    expect(migration).toContain('UQ_laboratory_rif_normalized');
  });

  /** Las configuraciones de impresion, licencia y contacto son opcionales. */
  it('allows optional and module-specific laboratory settings', () => {
    for (const column of optionalColumns) {
      expect(migration).toContain(`ALTER COLUMN "${column}" DROP NOT NULL`);
    }
  });

  /** La baseline basica no aprovisiona laboratorios. */
  it('does not seed a laboratory', () => {
    expect(migration).not.toMatch(/INSERT INTO\s+"laboratory"\s*\(/);
  });

  /** Conserva una unica migracion baseline. */
  it('keeps exactly one migration file', () => {
    const migrations = readdirSync('src/database/migrations').filter((name) => name.endsWith('.ts'));
    expect(migrations).toEqual(['1790366400000-BioNexusBaseline.ts']);
  });
});
