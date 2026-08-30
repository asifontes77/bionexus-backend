import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';

describe('UsersService session duration', () => {
  it('firma la renovacion con la duracion configurada del laboratorio', async () => {
    const jwt = { sign: jest.fn().mockReturnValue('renewed-token') };
    const repository = { findOne: jest.fn().mockResolvedValue({ id: 7, name: 'Usuario', hide_user: false }) };
    const settingsRepository = { findOne: jest.fn().mockResolvedValue({ session_timeout_minutes: 45 }) };
    const dataSource = { getRepository: jest.fn().mockReturnValue(settingsRepository) };
    const service = new UsersService(repository as never, jwt as unknown as JwtService, {} as never, {} as never, dataSource as never);
    await service.renewUserSession(7);
    expect(jwt.sign).toHaveBeenCalledWith({ id: 7, name: 'Usuario' }, { expiresIn: '45m' });
  });

  it('usa 30 minutos cuando no existe configuracion disponible', async () => {
    const jwt = { sign: jest.fn().mockReturnValue('token') };
    const repository = { findOne: jest.fn().mockResolvedValue({ id: 8, name: 'Usuario', hide_user: false }) };
    const service = new UsersService(repository as never, jwt as unknown as JwtService, {} as never, {} as never);
    await service.renewUserSession(8);
    expect(jwt.sign).toHaveBeenCalledWith({ id: 8, name: 'Usuario' }, { expiresIn: '30m' });
  });
});
