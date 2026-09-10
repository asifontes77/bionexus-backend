import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { AdmissionTariffResolverController } from './admission-tariff-resolver.controller';

describe('AdmissionTariffResolverController authorization', () => {
  it('exige tariffs.read para resolver tarifas de admision', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        AdmissionTariffResolverController.prototype.resolve,
      ),
    ).toEqual(['tariffs.read']);
  });

  it('protege el controlador con JWT y PermissionGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdmissionTariffResolverController,
    );
    expect(guards).toContain(JwtUserGuard);
    expect(guards).toContain(PermissionGuard);
  });
});
