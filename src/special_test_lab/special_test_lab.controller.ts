import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { getSecurityAuditActorUserId, SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { AuthorizationService } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateSpecialTestLabDto } from './dto/create-special_test_lab.dto';
import { UpdateSpecialTestLabDto } from './dto/update-special_test_lab.dto';
import { SpecialTestLabService } from './special_test_lab.service';

@Controller('specialtestlab')
export class SpecialtestlabController {
  constructor(private readonly service: SpecialTestLabService, private readonly authorization: AuthorizationService) {}

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('special-tests.read')
  @Get()
  getSpecialTestLabList() { return this.service.getSpecialTestLabList(); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('special-tests.read')
  @Get(':id')
  getSpecialTestLab(@Param('id', ParseIntPipe) id: number) { return this.service.getSpecialTestLab(id); }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('special-tests.create')
  @Post()
  createSpecialTestLab(@Req() request: SecurityAuthenticatedRequest, @Body() body: CreateSpecialTestLabDto) {
    return this.service.createSpecialTestLab(body, getSecurityAuditActorUserId(request) ?? undefined);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateSpecialTestLab(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateSpecialTestLabDto) {
    const actorUserId = getSecurityAuditActorUserId(request);
    if (!actorUserId) throw new ForbiddenException('SPECIAL_TEST_ACTOR_REQUIRED');
    const permissions: string[] = [];
    const has = (field: string) => Object.prototype.hasOwnProperty.call(body, field) && (body as Record<string, unknown>)[field] !== undefined;
    if (['description', 'details', 'address', 'phone_1', 'phone_2', 'email'].some(has)) permissions.push('special-tests.update');
    if (has('annulled')) permissions.push('special-tests.update');
    if (permissions.length && !(await this.authorization.hasAllPermissions(actorUserId, permissions))) throw new ForbiddenException('SPECIAL_TEST_PERMISSION_REQUIRED');
    return this.service.updateSpecialTestLab(id, body, actorUserId);
  }
}
