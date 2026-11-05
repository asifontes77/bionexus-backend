import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService login credentials', () => {
  function createService(user: unknown, laboratoryId = 7) {
    const repository = { findOne: jest.fn().mockResolvedValue(user) };
    const laboratory = {
      findByAccessSlug: jest.fn().mockResolvedValue({ id: laboratoryId, access_slug: 'lab-a', name: 'Lab' }),
      getTenantContextByAccessSlug: jest.fn().mockResolvedValue({ access_slug: 'lab-a', laboratory_name: 'Lab' }),
    };
    const license = { validateLicenseKey: jest.fn().mockResolvedValue(true) };
    const jwt = { sign: jest.fn().mockReturnValue('tenant-token') };
    return {
      service: new UsersService(repository as never, jwt as never, laboratory as never, license as never),
      repository,
      laboratory,
      jwt,
    };
  }

  it('rechaza usuario inexistente con la respuesta segura', async () => {
    const { service } = createService(null);
    await expect(service.getUserSession({ access_slug: 'lab-a', user_name: 'nadie', password: 'x' })).rejects.toMatchObject({
      message: 'INVALID_CREDENTIALS',
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('rechaza clave incorrecta con exactamente la misma respuesta', async () => {
    const passwordHash = await bcrypt.hash('correcta', 8);
    const { service } = createService({ id: 1, name: 'Usuario', user_name: 'usuario', password: passwordHash });
    await expect(service.getUserSession({ access_slug: 'lab-a', user_name: 'usuario', password: 'incorrecta' })).rejects.toMatchObject({
      message: 'INVALID_CREDENTIALS',
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('aisla usuarios por el laboratorio resuelto y emite su contexto, aunque se repita el username', async () => {
    const passwordHash = await bcrypt.hash('correcta', 8);
    const { service, repository, jwt } = createService({
      id: 9, laboratory_id: 7, name: 'Usuario', user_name: 'compartido',
      password: passwordHash, request_password: true,
    });

    await expect(service.getUserSession({
      access_slug: 'lab-a', user_name: 'compartido', password: 'correcta',
      laboratory_id: 999,
    } as never)).resolves.toEqual(expect.objectContaining({ token: 'tenant-token', mustChangePassword: true }));
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { user_name: 'compartido', laboratory_id: 7 },
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ laboratoryId: 7, identityType: 'tenant-user' }),
      expect.any(Object),
    );
  });

  it('rechaza el login sin tenant y una discrepancia entre slug y host con el mismo error genérico', async () => {
    const { service, laboratory, repository } = createService(null);
    const invalidCredentials = { message: 'INVALID_CREDENTIALS', status: HttpStatus.UNAUTHORIZED };

    await expect(service.getUserSession({
      access_slug: '', user_name: 'usuario', password: 'x',
    })).rejects.toMatchObject(invalidCredentials);
    await expect(service.getUserSession({
      access_slug: 'lab-b', user_name: 'usuario', password: 'x',
    }, 'lab-a.bionexus.app')).rejects.toMatchObject(invalidCredentials);

    expect(laboratory.findByAccessSlug).not.toHaveBeenCalled();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('permite resolver el tenant desde el body en el host reservado de la API', async () => {
    const passwordHash = await bcrypt.hash('correcta', 8);
    const { service, laboratory } = createService({
      id: 9, laboratory_id: 7, name: 'Usuario', user_name: 'usuario',
      password: passwordHash, request_password: false,
    });

    await expect(service.getUserSession({
      access_slug: 'lab-a', user_name: 'usuario', password: 'correcta',
    }, 'api.bionexus.app')).resolves.toEqual(
      expect.objectContaining({ identityType: 'tenant-user' }),
    );
    expect(laboratory.findByAccessSlug).toHaveBeenCalledWith('lab-a');
  });

  it('expone solamente el contexto público del laboratorio', async () => {
    const { service, laboratory } = createService(null);
    await expect(service.getTenantContextByAccessSlug('lab-a')).resolves.toEqual({
      access_slug: 'lab-a',
      laboratory_name: 'Lab',
    });
    expect(laboratory.getTenantContextByAccessSlug).toHaveBeenCalledWith('lab-a');
  });
});
