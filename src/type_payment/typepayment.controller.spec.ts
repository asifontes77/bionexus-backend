import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationService } from '../authorization/authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { typepaymentController } from './typepayment.controller';
import { TypePaymentService } from './typepayment.service';

describe('typepaymentController', () => {
  const service = {
    getTypepayment: jest.fn(),
    getTypepayments: jest.fn(),
    createTypepayment: jest.fn(),
    updateTypepayment: jest.fn(),
  };
  const authorization = { hasAllPermissions: jest.fn() };
  let controller: typepaymentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new typepaymentController(
      service as unknown as TypePaymentService,
      authorization as unknown as AuthorizationService,
    );
  });

  it.each([
    ['getTypepayment', 'typepayment.read'],
    ['getTypepayments', 'typepayment.read'],
    ['createTypepayment', 'typepayment.create'],
  ] as const)('protege %s con JWT, PermissionGuard y %s', (methodName, permission) => {
    const method = typepaymentController.prototype[methodName];
    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([JwtUserGuard, PermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, method)).toEqual([permission]);
  });

  it('propaga actor autenticado en create', async () => {
    service.createTypepayment.mockResolvedValue({ id: 1 });
    await controller.createTypepayment(request(5), { description: 'Efectivo' });
    expect(service.createTypepayment).toHaveBeenCalledWith({ description: 'Efectivo' }, 5);
  });

  it('exige update para campos descriptivos', async () => {
    authorization.hasAllPermissions.mockResolvedValue(true);
    service.updateTypepayment.mockResolvedValue({ id: 1 });
    await controller.updateTypepayment(request(5), 1, { description_1: 'Banco' });
    expect(authorization.hasAllPermissions).toHaveBeenCalledWith(5, ['typepayment.update']);
  });

  it('exige change-status para annulled', async () => {
    authorization.hasAllPermissions.mockResolvedValue(true);
    service.updateTypepayment.mockResolvedValue({ id: 1 });
    await controller.updateTypepayment(request(5), 1, { annulled: true });
    expect(authorization.hasAllPermissions).toHaveBeenCalledWith(5, ['typepayment.change-status']);
  });

  it('exige ambos permisos para contenido y estado', async () => {
    authorization.hasAllPermissions.mockResolvedValue(true);
    service.updateTypepayment.mockResolvedValue({ id: 1 });
    await controller.updateTypepayment(request(5), 1, { description: 'Tarjeta', annulled: false });
    expect(authorization.hasAllPermissions).toHaveBeenCalledWith(5, [
      'typepayment.update',
      'typepayment.change-status',
    ]);
  });

  it('rechaza permisos insuficientes', async () => {
    authorization.hasAllPermissions.mockResolvedValue(false);
    await expect(controller.updateTypepayment(request(5), 1, { description: 'Tarjeta' }))
      .rejects.toThrow(new ForbiddenException('TYPEPAYMENT_PERMISSION_REQUIRED'));
    expect(service.updateTypepayment).not.toHaveBeenCalled();
  });

  function request(userId: number) {
    return { user: { userId, username: 'tester' } };
  }
});
