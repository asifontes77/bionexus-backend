import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './users.entity';

describe('UsersService required password change', () => {
  it('changes the hash and clears request_password atomically', async () => {
    const user = { id: 7, name: 'Admin', user_name: 'admin', password: 'old-hash', request_password: true, hide_user: false, laboratory_id: 3 } as User;
    const repository = { findOne: jest.fn().mockResolvedValue(user), save: jest.fn(async value => value) };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = { transaction: jest.fn(async callback => callback(manager)), getRepository: jest.fn().mockReturnValue(repository) };
    const jwt = { sign: jest.fn().mockResolvedValue('new-token') };
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never).mockResolvedValueOnce(false as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never);
    const service = new UsersService({} as Repository<User>, jwt as unknown as JwtService, {} as never, {} as never, dataSource as unknown as DataSource);
    await expect(service.changeRequiredPassword(7, { currentPassword: 'Temporary!123', newPassword: 'Permanent!456', newPasswordConfirmation: 'Permanent!456' })).resolves.toMatchObject({ token: 'new-token', mustChangePassword: false });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ password: 'new-hash', request_password: false }));
  });
});
