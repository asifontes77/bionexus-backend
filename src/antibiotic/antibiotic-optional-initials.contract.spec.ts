import { readFileSync } from 'node:fs';
describe('Antibiotic optional initials contract', () => {
  const service = readFileSync('src/antibiotic/antibiotic.service.ts', 'utf8');
  const createDto = readFileSync('src/antibiotic/dto/create-antibiotic.dto.ts', 'utf8');
  it('accepts empty initials and preserves the ten character limit', () => {
    expect(createDto).toContain('siglas?: string;');
    expect(service).toContain("optionalText(body.siglas, 10, 'ANTIBIOTIC_INITIALS_TOO_LONG')");
    expect(service).toContain("if (value === undefined || value === null) return '';");
    expect(service).not.toContain("this.text(body.siglas, 10, 'ANTIBIOTIC_INITIALS_REQUIRED'");
  });
});
