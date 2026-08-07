import { User } from '../users.entity';
import {
  SafeUserResponse,
  toSafeUserResponse,
  toSafeUserResponses,
} from './user-response.mapper';

describe('user-response.mapper', () => {
  it('proyecta un usuario sin campos sensibles', () => {
    const user = createUser();

    const result = toSafeUserResponse(user);

    expect(result).toEqual({
      id: 7,
      name: 'Usuario de prueba',
      user_name: 'test.user',
      college_number: 'BIO-123',
      telephone: '+58 0000 000 0000',
      url_photo: 'user.png',
      url_signature: 'signature.png',
      direction: 'Direccion de prueba',
      position: 'Bioanalista',
      email: 'test@example.com',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: 'admin,annular',
      hide_user: false,
    });
  });

  it.each([
    'password',
    'passwordSignature',
    'key_signing',
    'key_recover',
    'request_password',
  ])(
    'excluye el campo sensible %s',
    (sensitiveField) => {
      const result = toSafeUserResponse(
        createUser(),
      );

      expect(result).not.toHaveProperty(
        sensitiveField,
      );
    },
  );

  it('normaliza campos opcionales ausentes como null', () => {
    const user = createUser();

    user.college_number = null;
    user.url_photo = null;
    user.url_signature = null;
    user.direction = null;
    user.position = null;
    user.email = null;

    expect(toSafeUserResponse(user)).toMatchObject({
      college_number: null,
      url_photo: null,
      url_signature: null,
      direction: null,
      position: null,
      email: null,
    });
  });

  it('proyecta listas sin reutilizar las entidades originales', () => {
    const firstUser = createUser();
    const secondUser = createUser();

    secondUser.id = 8;
    secondUser.user_name = 'second.user';

    const result = toSafeUserResponses([
      firstUser,
      secondUser,
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).not.toBe(firstUser);
    expect(result[1]).not.toBe(secondUser);
    expect(result.map((item) => item.id)).toEqual([
      7,
      8,
    ]);
  });

  it('mantiene una forma de respuesta explicitamente tipada', () => {
    const result: SafeUserResponse =
      toSafeUserResponse(createUser());

    expect(result.id).toBe(7);
    expect(result.user_name).toBe('test.user');
  });
});

function createUser(): User {
  const createdAt = new Date('2026-08-07T00:00:00.000Z');
  const updatedAt = new Date('2026-08-07T01:00:00.000Z');

  return {
    id: 7,
    password: 'password-hash',
    name: 'Usuario de prueba',
    user_name: 'test.user',
    college_number: 'BIO-123',
    telephone: '+58 0000 000 0000',
    key_signing: 'internal-signing-key',
    url_photo: 'user.png',
    url_signature: 'signature.png',
    direction: 'Direccion de prueba',
    position: 'Bioanalista',
    email: 'test@example.com',
    key_recover: 123456,
    request_password: false,
    createdAt,
    updatedAt,
    roles: 'admin,annular',
    passwordSignature: 'signature-hash',
    hide_user: false,
  };
}
