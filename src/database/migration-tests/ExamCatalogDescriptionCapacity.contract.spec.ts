import { readFileSync } from 'node:fs';

describe('Exam catalog description capacity contract',()=>{
  const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
  const snapshot=JSON.parse(readFileSync('src/database/seed-data/releases/1.0.0/exam-catalog.json','utf8'));
  it('fits every normalized exam description in the real baseline definition',()=>{
    const maximum=Math.max(...snapshot.tables.exam_catalog.map((row:Record<string,unknown>)=>String(row.description??'').length));
    const positions=[...baseline.matchAll(/exam_catalog/g)].map(match=>match.index??0);
    const values:number[]=[];
    for(const position of positions){const window=baseline.slice(Math.max(0,position-6000),Math.min(baseline.length,position+12000));const object=window.match(/name\s*:\s*['"]description['"][\s\S]{0,500}?type\s*:\s*['"](?:character varying|varchar)['"][\s\S]{0,300}?length\s*:\s*['"](\d+)['"]/i);const sql=window.match(/['"]description['"]\s+(?:character varying|varchar)\((\d+)\)/i);if(object)values.push(Number(object[1]));if(sql)values.push(Number(sql[1]));}
    expect(values.length).toBeGreaterThan(0);
    expect(Math.max(...values)).toBeGreaterThanOrEqual(maximum);
    expect(Math.max(...values)).toBeGreaterThan(60);
  });
});
