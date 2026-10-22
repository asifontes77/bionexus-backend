import * as fs from 'node:fs';
import { gunzipSync } from 'node:zlib';

describe('Patient admission receipt number contract',()=>{
  const root=__dirname+'/..';
  const read=(path:string)=>fs.readFileSync(root+'/'+path,'utf8');

  it('preserva configuraciones y exige numero emitido',()=>{
    const laboratory=read('laboratory/laboratory.entity.ts');
    expect(laboratory).toContain('rows_description_receipt: number;');
    expect(laboratory).toContain('receipt_number: number;');
    expect(laboratory).toContain('print_receipt: boolean;');
    expect(laboratory).toContain('maximum_rows_report: number;');
    const patient=read('patients/patients.entity.ts');
    expect(patient).toContain('receipt_number: number;');
    expect(patient).not.toContain('receipt_number: number | null;');
  });

  it('consolida la columna obligatoria solo en la baseline unica',()=>{
    const migration=read('database/migrations/1790366400000-BioNexusBaseline.ts');
    const encoded=migration.match(/const BASELINE_GZIP_BASE64 = '([^']+)'/)?.[1];
    expect(encoded).toBeTruthy();
    const sql=gunzipSync(Buffer.from(encoded!,'base64')).toString('utf8');
    const start=sql.indexOf('CREATE TABLE public.patient_admissions');
    const end=sql.indexOf(';',start);
    const table=sql.slice(start,end+1);
    expect(table).toMatch(/receipt_number integer NOT NULL/);
    expect(table).not.toMatch(/receipt_number integer DEFAULT NULL/);
  });

  it('asigna en backend y devuelve el mismo numero persistido',()=>{
    const repository=read('patient-admission-close/patient-admission-close.repository.ts');
    const service=read('patient-admission-close/patient-admission-close.service.ts');
    expect(repository).toContain("setLock('pessimistic_write')");
    expect(repository).toContain('receiptNumber:admission.receipt_number');
    expect(service).toContain('rows.admission.receipt_number=receiptNumber');
  });
});
