import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService login credentials', () => {
  function createService(user: unknown) {
    const repository = { findOne: jest.fn().mockResolvedValue(user) };
    const laboratory = { getLaboratory: jest.fn().mockResolvedValue({ rif: 'J-1', business_name: 'Lab', license: 'key' }) };
    const license = { validateLicenseKey: jest.fn().mockResolvedValue(true) };
    return new UsersService(repository as never, {} as never, laboratory as never, license as never);
  }

  it('rechaza usuario inexistente con la respuesta segura', async () => {
    const service = createService(null);
    await expect(service.getUserSession({ user_name: 'nadie', password: 'x' })).rejects.toMatchObject({
      message: 'INVALID_CREDENTIALS',
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('rechaza clave incorrecta con exactamente la misma respuesta', async () => {
    const passwordHash = await bcrypt.hash('correcta', 8);
    const service = createService({ id: 1, name: 'Usuario', user_name: 'usuario', password: passwordHash });
    await expect(service.getUserSession({ user_name: 'usuario', password: 'incorrecta' })).rejects.toMatchObject({
      message: 'INVALID_CREDENTIALS',
      status: HttpStatus.UNAUTHORIZED,
    });
  });
});
