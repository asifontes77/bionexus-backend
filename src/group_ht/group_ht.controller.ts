import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SecurityAuthenticatedRequest } from '../audit/security-audit-context';
import { AuthorizationService } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateGroup_htDto } from './dto/create-group_ht.dto';
import { UpdateGroup_htDto } from './dto/update-group_ht.dto';
import { GroupHtService } from './group_ht.service';

@Controller('groupHt')
@UseGuards(JwtUserGuard, PermissionGuard)
export class GroupHtController {
  constructor(private readonly groupHtService: GroupHtService, private readonly authorizationService: AuthorizationService) {}

  @RequirePermissions('worksheet-groups.read')
  @Get()
  getGroupHtList() { return this.groupHtService.getGroupHtList(); }

  @RequirePermissions('worksheet-groups.read')
  @Get('list')
  getGroupHtListActive() { return this.groupHtService.getGroupHtListActive(); }

  @RequirePermissions('worksheet-groups.read')
  @Get('count/:description')
  countWithLike(@Param('description') description: string) { return this.groupHtService.countWithLike(description); }

  @RequirePermissions('worksheet-groups.read')
  @Get('group/:id')
  getExamgroupsListGroup() { return this.groupHtService.getGroupList(); }

  @RequirePermissions('worksheet-groups.read')
  @Get(':id')
  getGroupHt(@Param('id', ParseIntPipe) id: number) { return this.groupHtService.getGroupHt(id); }

  @RequirePermissions('worksheet-groups.create')
  @Post()
  createGroupHt(@Body() body: CreateGroup_htDto) { return this.groupHtService.createGroupHt(body); }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  async updateGroupHt(@Req() request: SecurityAuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateGroup_htDto) {
    const actorUserId = request.user?.userId;
    if (!Number.isInteger(actorUserId) || actorUserId === undefined || actorUserId <= 0) throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    const requiredPermissions: string[] = [];
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (['description', 'details'].some((field) => Object.prototype.hasOwnProperty.call(body, field))) requiredPermissions.push('worksheet-groups.update');
      if (Object.prototype.hasOwnProperty.call(body, 'annulled')) requiredPermissions.push('worksheet-groups.update');
    }
    if (requiredPermissions.length > 0 && !(await this.authorizationService.hasAllPermissions(actorUserId, requiredPermissions))) {
      throw new ForbiddenException('WORKSHEET_GROUP_PERMISSION_REQUIRED');
    }
    return this.groupHtService.updateGroupHt(id, body);
  }

  @RequirePermissions('worksheet-groups.update')
  @Delete(':id')
  deleteGroupHt(@Param('id', ParseIntPipe) id: number) { return this.groupHtService.deleteGroupHt(id); }
}
