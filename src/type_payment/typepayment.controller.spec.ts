import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationService } from '../authorization/authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { typepaymentController } from './typepayment.controller';
import { TypePaymentService } from './typepayment.service';

describe('typepaymentController normalized', () => {
  const service={getTypepayment:jest.fn(),getTypepayments:jest.fn(),createTypepayment:jest.fn(),updateTypepayment:jest.fn()};
  const authorization={hasAllPermissions:jest.fn()};
  let controller:typepaymentController;
  beforeEach(()=>{jest.clearAllMocks();controller=new typepaymentController(service as unknown as TypePaymentService,authorization as unknown as AuthorizationService);});
  it.each([['getTypepayment','typepayment.read'],['getTypepayments','typepayment.read'],['createTypepayment','typepayment.create']] as const)('protege %s con %s',(methodName,permission)=>{const method=typepaymentController.prototype[methodName];expect(Reflect.getMetadata(GUARDS_METADATA,method)).toEqual([JwtUserGuard,PermissionGuard]);expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY,method)).toEqual([permission]);});
  it('propaga actor y contrato normalizado en create',async()=>{const body={code:'card',description:'Tarjeta',currencyIds:[1,2],defaultCurrencyId:1};await controller.createTypepayment(request(5),body);expect(service.createTypepayment).toHaveBeenCalledWith(body,5);});
  it('exige update para contenido normalizado',async()=>{authorization.hasAllPermissions.mockResolvedValue(true);await controller.updateTypepayment(request(5),1,{currencyIds:[1,2],defaultCurrencyId:1});expect(authorization.hasAllPermissions).toHaveBeenCalledWith(5,['typepayment.update']);});
  it('exige ambos permisos para contenido y estado',async()=>{authorization.hasAllPermissions.mockResolvedValue(true);await controller.updateTypepayment(request(5),1,{description:'Tarjeta',annulled:false});expect(authorization.hasAllPermissions).toHaveBeenCalledWith(5,['typepayment.update','typepayment.change-status']);});
  it('rechaza permisos insuficientes',async()=>{authorization.hasAllPermissions.mockResolvedValue(false);await expect(controller.updateTypepayment(request(5),1,{description:'Tarjeta'})).rejects.toThrow(new ForbiddenException('TYPEPAYMENT_PERMISSION_REQUIRED'));});
  function request(userId:number){return{user:{userId,username:'tester'}};}
});
