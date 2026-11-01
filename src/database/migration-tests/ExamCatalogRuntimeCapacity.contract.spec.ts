import { readFileSync } from 'node:fs';

describe('Exam catalog runtime capacity contract',()=>{
 const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
 const snapshot=JSON.parse(readFileSync('src/database/seed-data/releases/1.0.0/exam-catalog.json','utf8'));
 it('contains an explicit baseline widening for normalized descriptions',()=>{
  const maximum=Math.max(...snapshot.tables.exam_catalog.map((row:Record<string,unknown>)=>String(row.description??'').length));
  const sizes=[...baseline.matchAll(/ALTER TABLE "exam_catalog" ALTER COLUMN "description" TYPE character varying\((\d+)\)/g)].map(match=>Number(match[1]));
  expect(sizes.length).toBeGreaterThan(0);expect(Math.max(...sizes)).toBeGreaterThanOrEqual(maximum);
 });
});
