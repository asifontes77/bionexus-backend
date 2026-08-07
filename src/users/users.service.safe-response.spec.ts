import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LaboratoryService } from '../laboratory/laboratory.service';
import { LicenseService } from '../license/license.service';
import { User } from './users.entity';
import { UsersService } from './users.service';

describe('UsersService safe responses', () => {
  let service: UsersService;
  let usersRepository: RepositoryMock;
  let jwtService: { sign: jest.Mock };
  let laboratoryService: { getLaboratory: jest.Mock };
  let licenseService: { validateLicenseKey: jest.Mock };

  beforeEach(() => {
    usersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
    };

    laboratoryService = {
      getLaboratory: jest.fn(),
    };

    licenseService = {
      validateLicenseKey: jest.fn(),
    };

    service = new UsersService(
      usersRepository as unknown as Repository<User>,
      jwtService as unknown as JwtService,
      laboratoryService as unknown as LaboratoryService,
      licenseService as unknown as LicenseService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('protege el listado general', async () => {
    usersRepository.find.mockResolvedValue([createUser()]);

    const result = await service.getUsers();

    expect(result).toHaveLength(1);
    expectSafeUser(result[0]);
  });

  it('protege el listado ordenado', async () => {
    usersRepository.find.mockResolvedValue([createUser()]);

    const result = await service.getUsersOrder();

    expectSafeUser(result[0]);

    expect(usersRepository.find).toHaveBeenCalledWith({
      order: {
        name: 'ASC',
      },
    });
  });

  it('protege el listado de usuarios con firma', async () => {
    const getMany = jest.fn().mockResolvedValue([createUser()]);
    const where = jest.fn().mockReturnValue({ getMany });

    usersRepository.createQueryBuilder.mockReturnValue({
      where,
    });

    const result = await service.getSignatureUsers();

    expectSafeUser(result[0]);
    expect(result[0].url_signature).toBe('signature.png');
    expect(result[0]).not.toHaveProperty('passwordSignature');
  });

  it('protege la consulta individual', async () => {
    usersRepository.findOne.mockResolvedValue(createUser());

    const result = await service.getUser(7);

    expect(result).not.toBeInstanceOf(HttpException);
    expectSafeUser(result);
  });

  it('mantiene el error cuando el usuario no existe', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.getUser(999)).resolves.toBeInstanceOf(
      HttpException,
    );
  });

  it('protege la respuesta de creacion', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockResolvedValue(createUser());

    const result = await service.createUser({
      name: 'Usuario de prueba',
      user_name: 'test.user',
      college_number: 'BIO-123',
      password: 'password-value',
      telephone: '+58 0000 000 0000',
      direction: 'Direccion de prueba',
      position: 'Bioanalista',
      email: 'test@example.com',
      roles: 'admin,annular',
      storages: {},
      passwordSignature: '',
      hide_user: false,
    });

    expectSafeUser(result);
  });

  it('protege la respuesta de actualizacion', async () => {
    const user = createUser();

    usersRepository.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);

    usersRepository.save.mockResolvedValue({
      ...user,
      name: 'Usuario actualizado',
    });

    const result = await service.updateUser(7, {
      name: 'Usuario actualizado',
      user_name: 'test.user',
    });

    expectSafeUser(result);
    expect(result).toMatchObject({
      id: 7,
      name: 'Usuario actualizado',
    });
  });

  it('mantiene token y protege el usuario del login', async () => {
    configureLogin();

    const result = await service.getUserSession({
      user_name: 'test.user',
      password: 'password-value',
    });

    expect(result).not.toBeInstanceOf(HttpException);

    if (result instanceof HttpException) {
      throw new Error('Unexpected login error.');
    }

    expect(result.token).toBe('jwt-token');
    expectSafeUser(result.user);
  });

  it.each([
    'password',
    'passwordSignature',
    'key_signing',
    'key_recover',
    'request_password',
  ])(
    'el login excluye %s',
    async (sensitiveField) => {
      configureLogin();

      const result = await service.getUserSession({
        user_name: 'test.user',
        password: 'password-value',
      });

      if (result instanceof HttpException) {
        throw new Error('Unexpected login error.');
      }

      expect(result.user).not.toHaveProperty(sensitiveField);
    },
  );

  function configureLogin() {
    laboratoryService.getLaboratory.mockResolvedValue({
      rif: 'J-00000000-0',
      business_name: 'Laboratorio',
      license: 'license-value',
    });

    licenseService.validateLicenseKey.mockResolvedValue(true);
    usersRepository.findOne.mockResolvedValue(createUser());
    jwtService.sign.mockResolvedValue('jwt-token');

    jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);
  }
});

type RepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function expectSafeUser(user: object) {
  expect(user).toMatchObject({
    id: 7,
    user_name: 'test.user',
    roles: 'admin,annular',
  });

  expect(user).not.toHaveProperty('password');
  expect(user).not.toHaveProperty('passwordSignature');
  expect(user).not.toHaveProperty('key_signing');
  expect(user).not.toHaveProperty('key_recover');
  expect(user).not.toHaveProperty('request_password');
}

function createUser(): User {
  return {
    id: 7,
    password: 'password-hash',
    name: 'Usuario de prueba',
    user_name: 'test.user',
    college_number: 'BIO-123',
    telephone: '+58 0000 000 0000',
    key_signing: 'internal-key',
    url_photo: 'user.png',
    url_signature: 'signature.png',
    direction: 'Direccion de prueba',
    position: 'Bioanalista',
    email: 'test@example.com',
    key_recover: 123456,
    request_password: false,
    createdAt: new Date('2026-08-07T00:00:00.000Z'),
    updatedAt: new Date('2026-08-07T01:00:00.000Z'),
    roles: 'admin,annular',
    passwordSignature: 'signature-hash',
    hide_user: false,
  };
}
