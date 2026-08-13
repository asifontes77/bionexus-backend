import { ForbiddenException, MethodNotAllowedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { SecurityRole } from '../authorization/entities/security-role.entity';
import { SecurityUserRole } from '../authorization/entities/security-user-role.entity';
import { LaboratoryService } from '../laboratory/laboratory.service';
import { LicenseService } from '../license/license.service';
import { User } from './users.entity';
import { UsersService } from './users.service';

describe('UsersService identity management hardening', () => {
  let service: UsersService;
  let usersRepository: Record<string, jest.Mock>;
  let transactionalUsersRepository: Record<string, jest.Mock>;
  let rolesRepository: Record<string, jest.Mock>;
  let userRolesRepository: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    usersRepository = { findOne: jest.fn(), save: jest.fn() };
    transactionalUsersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };
    rolesRepository = { findOne: jest.fn() };
    userRolesRepository = { findOne: jest.fn(), find: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) return transactionalUsersRepository;
        if (entity === SecurityRole) return rolesRepository;
        if (entity === SecurityUserRole) return userRolesRepository;
        throw new Error('UNKNOWN_ENTITY');
      }),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    service = new UsersService(
      usersRepository as unknown as Repository<User>,
      {} as JwtService,
      {} as LaboratoryService,
      {} as LicenseService,
      dataSource as unknown as DataSource,
    );
  });

  it('deshabilita la eliminacion fisica de usuarios', async () => {
    await expect(service.deleteUser(7)).rejects.toBeInstanceOf(
      MethodNotAllowedException,
    );
  });

  it('no consulta duplicidad de username para un parche exclusivo de estado', async () => {
    const user = createUser(false);
    transactionalUsersRepository.findOne.mockResolvedValueOnce(user);
    rolesRepository.findOne.mockResolvedValue({ id: 1 });
    userRolesRepository.findOne.mockResolvedValue(null);
    transactionalUsersRepository.save.mockImplementation(async (value) => value);

    await expect(
      service.updateUser(7, { hide_user: true }),
    ).resolves.toMatchObject({
      id: 7,
      hide_user: true,
    });

    expect(transactionalUsersRepository.findOne).toHaveBeenCalledTimes(1);
    expect(transactionalUsersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
    });
    expect(transactionalUsersRepository.findOne).not.toHaveBeenCalledWith({
      where: expect.objectContaining({ user_name: undefined }),
    });
  });

  it('reactiva un usuario dentro de una transaccion', async () => {
    const user = createUser(true);
    transactionalUsersRepository.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);
    transactionalUsersRepository.save.mockImplementation(async (value) => value);

    await expect(service.updateUser(7, { hide_user: false })).resolves.toMatchObject({
      id: 7,
      hide_user: false,
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(rolesRepository.findOne).not.toHaveBeenCalled();
  });

  it('permite inactivar un usuario sin rol admin', async () => {
    const user = createUser(false);
    transactionalUsersRepository.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);
    rolesRepository.findOne.mockResolvedValue({ id: 1 });
    userRolesRepository.findOne.mockResolvedValue(null);
    transactionalUsersRepository.save.mockImplementation(async (value) => value);

    await expect(service.updateUser(7, { hide_user: true })).resolves.toMatchObject({
      hide_user: true,
    });
  });

  it('rechaza inactivar al ultimo administrador visible', async () => {
    const user = createUser(false);
    transactionalUsersRepository.findOne.mockResolvedValueOnce(user);
    rolesRepository.findOne.mockResolvedValue({ id: 1 });
    userRolesRepository.findOne.mockResolvedValue({ userId: 7, roleId: 1 });
    userRolesRepository.find.mockResolvedValue([]);

    await expect(service.updateUser(7, { hide_user: true })).rejects.toMatchObject({
      response: { message: 'LAST_ACTIVE_ADMIN_REQUIRED' },
    });
    expect(transactionalUsersRepository.save).not.toHaveBeenCalled();
  });

  it('permite inactivar admin cuando existe otro administrador visible', async () => {
    const user = createUser(false);
    transactionalUsersRepository.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);
    rolesRepository.findOne.mockResolvedValue({ id: 1 });
    userRolesRepository.findOne.mockResolvedValue({ userId: 7, roleId: 1 });
    userRolesRepository.find.mockResolvedValue([{ userId: 8 }, { userId: 8 }]);
    transactionalUsersRepository.count.mockResolvedValue(1);
    transactionalUsersRepository.save.mockImplementation(async (value) => value);

    await expect(service.updateUser(7, { hide_user: true })).resolves.toMatchObject({
      hide_user: true,
    });
    expect(transactionalUsersRepository.count).toHaveBeenCalledTimes(1);
  });

  it('excluye administradores ocultos alternativos', async () => {
    const user = createUser(false);
    transactionalUsersRepository.findOne.mockResolvedValueOnce(user);
    rolesRepository.findOne.mockResolvedValue({ id: 1 });
    userRolesRepository.findOne.mockResolvedValue({ userId: 7, roleId: 1 });
    userRolesRepository.find.mockResolvedValue([{ userId: 8 }, { userId: 0 }]);
    transactionalUsersRepository.count.mockResolvedValue(0);

    await expect(service.updateUser(7, { hide_user: true })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(transactionalUsersRepository.save).not.toHaveBeenCalled();
  });
});

function createUser(hidden: boolean): User {
  return {
    id: 7, password: 'hash', name: 'Administrador', user_name: 'admin',
    college_number: null, telephone: '', key_signing: null, url_photo: null,
    url_signature: null, direction: null, position: null, email: null,
    key_recover: null, request_password: false, createdAt: new Date(),
    updatedAt: new Date(), roles: 'admin', passwordSignature: null,
    hide_user: hidden,
  };
}
