import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from './jwt-user.guard';
import { UsersController } from './users.controller';

describe('UsersController authorization', () => {
  it.each([
    ['getUsers', 'security.users.read'],
    ['getUsersOrder', 'security.users.read'],
    ['getUser', 'security.users.read'],
    ['verifyEmail', 'security.users.read'],
    ['verifyEmailId', 'security.users.read'],
    ['createUser', 'security.users.create'],
    ['updateUser', 'security.users.update'],
    ['deleteUser', 'security.users.update'],
    ['uploadFile', 'security.users.update'],
  ] as const)(
    'protege %s con JWT y permiso %s',
    (methodName, permission) => {
      const method = UsersController.prototype[methodName];

      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        method,
      );

      const permissions = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        method,
      );

      expect(guards).toContain(JwtUserGuard);
      expect(guards).toContain(PermissionGuard);
      expect(permissions).toEqual([permission]);
    },
  );

  it('mantiene el inicio de sesion sin guards', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      UsersController.prototype.getUserSession,
    );

    expect(guards).toBeUndefined();
  });

  it('mantiene el listado de firmas autenticado sin permiso administrativo', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      UsersController.prototype.getSignatureUsers,
    );

    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      UsersController.prototype.getSignatureUsers,
    );

    expect(guards).toContain(JwtUserGuard);
    expect(guards).not.toContain(PermissionGuard);
    expect(permissions).toBeUndefined();
  });


});
