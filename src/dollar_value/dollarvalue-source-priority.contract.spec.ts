import * as fs from 'node:fs';
import * as path from 'node:path';

describe('DollarValue source priority contract', () => {
  const root = path.resolve(__dirname, '../..');
  const source = fs.readFileSync(path.join(root, 'src/dollar_value/dollarvalue-source.service.ts'), 'utf8');

  it('keeps BCV primary and DolarApi only inside the BCV failure path', () => {
    expect(source).toMatch(/try \{ return await this\.fetchBcv\(bcvUrl\); \}\s*catch \(error\)/);
    expect(source).toContain('return this.fetchFallback(fallbackUrl)');
    expect(source.indexOf('this.fetchBcv(bcvUrl)')).toBeLessThan(source.indexOf('this.fetchFallback(fallbackUrl)'));
  });

  it('supports textual BCV dates in Spanish and logs the fallback reason', () => {
    expect(source).toContain("octubre: '10'");
    expect(source).toContain("BCV primary source failed. Falling back to DolarApi. Reason=");
  });

  it('uses venta and then promedio only for DolarApi', () => {
    expect(source).toContain('body.venta ?? body.promedio');
  });

  it('maps DolarApi publication date to the next business effective date', () => {
    expect(source).toContain('const publicationDate = this.parseDate');
    expect(source).toContain('const effectiveDate = this.nextBusinessDate(publicationDate);');
    expect(source).toContain('private nextBusinessDate(publicationDate: string)');
    expect(source).toContain('date.setUTCDate(date.getUTCDate() + 1)');
    expect(source).toContain('[0, 6].includes(date.getUTCDay())');
  });});
