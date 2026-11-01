import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Approved catalog varchar capacity contract',()=>{
  const baseline=readFileSync('src/database/migrations/1790366400000-BioNexusBaseline.ts','utf8');
  const root='src/database/seed-data/releases/1.0.0';
  const manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
  const approved=new Set(['antibiotic','list_germs','parasiticforms','sample_type','exam_group','exam_catalog','currencies','tax','tariffs','banks','type_payment','exam_tariff_prices']);
  it('fits every approved snapshot string into its declared varchar capacity',()=>{
    const maxima=new Map<string,number>();
    for(const pkg of manifest.packages){const document=JSON.parse(readFileSync(join(root,pkg.file),'utf8'));for(const [table,rows] of Object.entries(document.tables) as [string,Array<Record<string,unknown>>][]){if(!approved.has(table))continue;for(const row of rows){for(const [column,value] of Object.entries(row)){if(typeof value==='string'){const key=`${table}.${column}`;maxima.set(key,Math.max(maxima.get(key)??0,value.length));}}}}}
    for(const table of approved){const body=baseline.match(new RegExp(`CREATE TABLE "${table}" \\(([\\s\\S]*?)\\)\\);`))?.[1]??'';for(const match of body.matchAll(/"([^"]+)"\s+(?:character varying|varchar)\((\d+)\)/gi)){const observed=maxima.get(`${table}.${match[1]}`);if(observed!==undefined)expect(Number(match[2])).toBeGreaterThanOrEqual(observed);}}
  });
});
