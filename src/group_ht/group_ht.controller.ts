import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationService } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateGroup_htDto } from './dto/create-group_ht.dto';
import { UpdateGroup_htDto } from './dto/update-group_ht.dto';
import { GroupHtService } from './group_ht.service';
@Controller('groupHt')
export class GroupHtController {
  constructor(
    private readonly service: GroupHtService,
    private readonly authorization: AuthorizationService,
  ) {}
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-groups.read')
  @Get()
  getGroupHtList() {
    return this.service.getGroupHtList();
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-groups.read')
  @Get('/list')
  getGroupHtListActive() {
    return this.service.getGroupHtListActive();
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-groups.read')
  @Get(':id')
  getGroupHt(@Param('id', ParseIntPipe) id: number) {
    return this.service.getGroupHt(id);
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-groups.read')
  @Get('/count/:description')
  countWithLike(@Param('description') description: string) {
    return this.service.countWithLike(description);
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-groups.create')
  @Post()
  create(
    @Req() req: SecurityAuthenticatedRequest,
    @Body() body: CreateGroup_htDto,
  ) {
    return this.service.createGroupHt(
      body,
      getSecurityAuditActorUserId(req) ?? undefined,
    );
  }
  @UseGuards(JwtUserGuard) @Patch(':id') async update(
    @Req() req: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateGroup_htDto,
  ) {
    const actor = getSecurityAuditActorUserId(req);
    if (actor === null)
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    const fields = Object.keys(body ?? {});
    const required =
      fields.length === 1 && fields[0] === 'annulled'
        ? 'worksheet-groups.change-status'
        : 'worksheet-groups.update';
    if (!(await this.authorization.hasPermission(actor, required)))
      throw new ForbiddenException('WORKSHEET_GROUP_PERMISSION_REQUIRED');
    return this.service.updateGroupHt(id, body, actor);
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-groups.delete')
  @Delete(':id')
  remove(
    @Req() req: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteGroupHt(
      id,
      getSecurityAuditActorUserId(req) ?? undefined,
    );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-groups.read')
  @Get('/group/:id')
  getGroupList() {
    return this.service.getGroupList();
  }
}
