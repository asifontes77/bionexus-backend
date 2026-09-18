import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { TariffsController } from './tariffs.controller';

describe('TariffsController authorization', () => {
  it.each([
    ['getAll', 'tariffs.read'],
    ['getActive', 'tariffs.read'],
    ['getOne', 'tariffs.read'],
    ['create', 'tariffs.create'],
    ['update', 'tariffs.update'],
    ['changeStatus', 'tariffs.update'],
    ['setDefault', 'tariffs.update'],
  ] as const)('protege %s con %s', (method, permission) => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        TariffsController.prototype[method],
      ),
    ).toEqual([permission]);
  });

  it('protege el controlador con JWT y PermissionGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, TariffsController);
    expect(guards).toContain(JwtUserGuard);
    expect(guards).toContain(PermissionGuard);
  });
});
