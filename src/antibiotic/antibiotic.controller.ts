import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { AuthorizationService } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { AntibioticService } from './antibiotic.service';
import { CreateAntibioticDto } from './dto/create-antibiotic.dto';
import { UpdateAntibioticDto } from './dto/update-antibiotic.dto';

@Controller('antibiotic')
export class AntibioticController {
  constructor(private readonly antibioticService: AntibioticService, private readonly authorizationService: AuthorizationService) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('antibiotic.read')
  @Get()
  getAntibioticLists() { return this.antibioticService.getAntibioticLists(); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('antibiotic.read')
  @Get('order')
  getAntibioticListsOrder() { return this.antibioticService.getAntibioticListsOrder(); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('antibiotic.read')
  @Get(':id')
  getAntibiotic(@Param('id', ParseIntPipe) id: number) { return this.antibioticService.getAntibiotic(id); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('antibiotic.create')
  @Post()
  createAntibiotic(@Req() request: SecurityAuthenticatedRequest, @Body() body: CreateAntibioticDto) {
    return this.antibioticService.createAntibiotic(body, getSecurityAuditActorUserId(request) ?? undefined);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateAntibiotic(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateAntibioticDto) {
    const actorUserId = getSecurityAuditActorUserId(request);
    if (actorUserId === null) throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    const requiredPermissions: string[] = [];
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (['description', 'siglas'].some((field) => Object.prototype.hasOwnProperty.call(body, field))) requiredPermissions.push('antibiotic.update');
      if (Object.prototype.hasOwnProperty.call(body, 'annulled')) requiredPermissions.push('antibiotic.change-status');
    }
    if (requiredPermissions.length > 0 && !(await this.authorizationService.hasAllPermissions(actorUserId, requiredPermissions))) {
      throw new ForbiddenException('ANTIBIOTIC_PERMISSION_REQUIRED');
    }
    return this.antibioticService.updateAntibiotic(id, body, actorUserId);
  }
}