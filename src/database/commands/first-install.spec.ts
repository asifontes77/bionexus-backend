import { serializeInstallError } from './first-install';

describe('first-install observability', () => {
  it('serializa mensaje, codigo, detalle, constraint y causa', () => {
    const cause = Object.assign(new Error('inner'), { code: '23505', detail: 'duplicate', constraint: 'uq_test' });
    const error = Object.assign(new Error('outer'), { cause });
    expect(serializeInstallError(error)).toMatchObject({
      name: 'Error', message: 'outer', cause: { message: 'inner', code: '23505', detail: 'duplicate', constraint: 'uq_test' },
    });
  });
  it('serializa valores desconocidos sin perder el mensaje', () => {
    expect(serializeInstallError('failure')).toEqual({ name: 'UnknownError', message: 'failure' });
  });
});
