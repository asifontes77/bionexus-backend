import { Body,Controller,Get,Param,ParseIntPipe,Patch,Post,Req,UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId,SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { ChangeCurrencyStatusDto } from './dto/change-currency-status.dto';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrencyService } from './currency.service';
@UseGuards(JwtUserGuard,PermissionGuard) @Controller('currencies')
export class CurrencyController {
  constructor(private readonly service:CurrencyService){}
  @RequirePermissions('currencies.read') @Get() getAll(){return this.service.getAll();}
  @RequirePermissions('currencies.read') @Get('active') getActive(){return this.service.getActive();}
  @RequirePermissions('currencies.read') @Get(':id') getOne(@Param('id',ParseIntPipe)id:number){return this.service.getOne(id);}
  @RequirePermissions('currencies.create') @Post() create(@Req()request:SecurityAuthenticatedRequest,@Body()body:CreateCurrencyDto){return this.service.create(body,getSecurityAuditActorUserId(request)??undefined);}
  @RequirePermissions('currencies.update') @Patch(':id') update(@Req()request:SecurityAuthenticatedRequest,@Param('id',ParseIntPipe)id:number,@Body()body:UpdateCurrencyDto){return this.service.update(id,body,getSecurityAuditActorUserId(request)??undefined);}
  @RequirePermissions('currencies.change-status') @Patch(':id/status') changeStatus(@Req()request:SecurityAuthenticatedRequest,@Param('id',ParseIntPipe)id:number,@Body()body:ChangeCurrencyStatusDto){return this.service.changeStatus(id,body,getSecurityAuditActorUserId(request)??undefined);}
}
