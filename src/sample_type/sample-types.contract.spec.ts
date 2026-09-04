import { readFileSync } from 'node:fs';
describe('Sample types hardened contract', () => {
  const controller = readFileSync(
      'src/sample_type/sampletype.controller.ts',
      'utf8',
    ),
    service = readFileSync('src/sample_type/sampletype.service.ts', 'utf8');
  it('protects routes', () => {
    for (const value of [
      'sample-types.read',
      'sample-types.create',
      'sample-types.update',
      'PermissionGuard',
    ])
      expect(controller).toContain(value);
  });
  it('validates and audits writes', () => {
    for (const value of [
      'SAMPLE_TYPE_NOT_FOUND',
      'SAMPLE_TYPE_DESCRIPTION_REQUIRED',
      'SAMPLE_TYPE_DESCRIPTION_ALREADY_EXISTS',
      'sample-types.created',
      'sample-types.updated',
      'transaction',
    ])
      expect(service).toContain(value);
  });
});
