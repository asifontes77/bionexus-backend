import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

describe('RoutinesController authorization', () => {
  const controller = new RoutinesController({} as RoutinesService);
  it.each([
    ['getRoutinesList', 'routines.read'], ['getRoutines', 'routines.read'], ['countWithLike', 'routines.read'],
    ['createRoutines', 'routines.create'], ['updateRoutines', 'routines.update'], ['deleteRoutines', 'routines.delete'],
  ] as const)('protege %s con JWT, PermissionGuard y %s', (methodName, permission) => {
    const method = RoutinesController.prototype[methodName];
    expect(Reflect.getMetadata(GUARDS_METADATA, RoutinesController)).toEqual([JwtUserGuard, PermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, method)).toEqual([permission]);
  });
  it('conserva el controlador sobre /routines', () => { expect(controller).toBeDefined(); });
});
