import { Body, Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { ApplicationSettingsService } from './application-settings.service';
import { UpdateApplicationSettingsDto } from './dto/update-application-settings.dto';

@Controller('application-settings')
export class ApplicationSettingsController {
  constructor(private readonly service: ApplicationSettingsService) {}
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('application-settings.read')
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) { return this.service.get(id); }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('application-settings.update')
  @Patch(':id')
  update(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateApplicationSettingsDto) { return this.service.update(id, body, getSecurityAuditActorUserId(request) ?? undefined); }
}