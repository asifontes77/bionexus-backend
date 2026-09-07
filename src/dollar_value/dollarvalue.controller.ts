import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateDollarvalueDto } from './dto/create-dollarvalue.dto';
import { DollarvalueService } from './dollarvalue.service';
import { DollarvalueAutomationService } from './dollarvalue-automation.service';

@Controller('dollarvalue')
export class DollarvalueController {
  constructor(private readonly dollarvalueService: DollarvalueService, private readonly automation: DollarvalueAutomationService) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('dollar-value.read')
  @Get('get')
  getDollarvalue() { return this.dollarvalueService.getCurrent(); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('dollar-value.read')
  @Get('history')
  getHistory() { return this.dollarvalueService.getHistory(); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('dollar-value.update')
  @Post()
  publish(@Req() request: SecurityAuthenticatedRequest, @Body() body: CreateDollarvalueDto) {
    return this.dollarvalueService.publish(body, getSecurityAuditActorUserId(request) ?? undefined);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('dollar-value.read')
  @Get('automation')
  getAutomation() { return this.automation.getConfig(); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('dollar-value.update')
  @Post('automation/config')
  updateAutomation(@Req() request: SecurityAuthenticatedRequest, @Body() body: Record<string, unknown>) { return this.automation.updateConfig(body, getSecurityAuditActorUserId(request) ?? 0); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('dollar-value.update')
  @Post('automation/run')
  runAutomation(@Req() request: SecurityAuthenticatedRequest) { return this.automation.executeNow(getSecurityAuditActorUserId(request) ?? 0); }
}
