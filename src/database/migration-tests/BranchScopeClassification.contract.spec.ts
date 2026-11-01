import { readFileSync } from 'node:fs';

describe('Branch scope classification contract', () => {
  const baseline = readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts', 'utf8');
  const provisioning = readFileSync('src/platform/platform-provisioning.service.ts', 'utf8');

  it('creates exactly one mandatory main branch during laboratory provisioning', () => {
    expect(provisioning).toContain('INSERT INTO laboratory_branches');
    expect(provisioning).toContain('true,true,0');
    expect(provisioning).toContain('mainBranch:branch');
  });

  it('keeps branch scope on the five approved core operations', () => {
    for (const constraint of [
      'FK_cash_register_laboratory_branch',
      'FK_invoice_laboratory_branch',
      'FK_patient_admissions_laboratory_branch',
      'FK_patient_exams_laboratory_branch',
      'FK_way_pay_laboratory_branch',
    ]) expect(baseline).toContain(constraint);
  });

  it('keeps catalog adoption at laboratory scope rather than branch scope', () => {
    const packageTable = baseline.match(/CREATE TABLE "laboratory_catalog_packages" \(([\s\S]*?)\);/)?.[1] ?? '';
    expect(packageTable).toContain('"laboratory_id"');
    expect(packageTable).not.toContain('"laboratory_branch_id"');
  });

  it('does not add branch scope indiscriminately to the twelve shared catalog tables', () => {
    for (const table of ['antibiotic','list_germs','parasiticforms','sample_type','exam_group','exam_catalog','currencies','tax','tariffs','banks','type_payment','exam_tariff_prices']) {
      const create = baseline.match(new RegExp(`CREATE TABLE "${table}" \\(([\\s\\S]*?)\\);`))?.[1] ?? '';
      expect(create).not.toContain('"laboratory_branch_id"');
    }
  });
});
