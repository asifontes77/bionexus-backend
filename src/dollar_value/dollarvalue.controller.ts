import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateDollarvalueDto } from './dto/create-dollarvalue.dto';
import { DollarvalueAutomationService } from './dollarvalue-automation.service';
import { DollarvalueService } from './dollarvalue.service';

@Controller('dollarvalue')
export class DollarvalueController {
  constructor(private readonly dollarvalueService:DollarvalueService,private readonly automation:DollarvalueAutomationService){}
  @UseGuards(JwtUserGuard,PermissionGuard) @RequirePermissions('dollar-value.read') @Get('get') getDollarvalue(@Req() request:SecurityAuthenticatedRequest){return this.dollarvalueService.getCurrent(this.laboratoryId(request))}
  @UseGuards(JwtUserGuard,PermissionGuard) @RequirePermissions('dollar-value.read') @Get('history') getHistory(@Req() request:SecurityAuthenticatedRequest){return this.dollarvalueService.getHistory(this.laboratoryId(request))}
  @UseGuards(JwtUserGuard,PermissionGuard) @RequirePermissions('dollar-value.update') @Post() publish(@Req() request:SecurityAuthenticatedRequest,@Body() body:CreateDollarvalueDto){return this.dollarvalueService.publish(this.laboratoryId(request),body,getSecurityAuditActorUserId(request)??undefined)}
  @UseGuards(JwtUserGuard,PermissionGuard) @RequirePermissions('dollar-value.read') @Get('automation') getAutomation(@Req() request:SecurityAuthenticatedRequest){return this.automation.getConfig(this.laboratoryId(request))}
  @UseGuards(JwtUserGuard,PermissionGuard) @RequirePermissions('dollar-value.update') @Post('automation/config') updateAutomation(@Req() request:SecurityAuthenticatedRequest,@Body() body:Record<string,unknown>){return this.automation.updateConfig(this.laboratoryId(request),body,getSecurityAuditActorUserId(request)??0)}
  @UseGuards(JwtUserGuard,PermissionGuard) @RequirePermissions('dollar-value.update') @Post('automation/run') runAutomation(@Req() request:SecurityAuthenticatedRequest){return this.automation.executeNow(this.laboratoryId(request),getSecurityAuditActorUserId(request)??0)}
  private laboratoryId(request:SecurityAuthenticatedRequest):number{const id=Number(request.user?.laboratoryId);if(!Number.isInteger(id)||id<=0)throw new BadRequestException('LABORATORY_ID_INVALID');return id}
}
