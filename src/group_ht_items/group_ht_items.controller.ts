import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateGroup_ht_itemsDto } from './dto/create-group_ht_items.dto';
import { UpdateGroup_ht_itemsDto } from './dto/update-group_ht_items.dto';
import { GroupHtItemsService } from './group_h_itemst.service';
@Controller('groupHtItems')
export class GroupHtItemsController {
  constructor(private readonly service: GroupHtItemsService) {}
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-group-items.read')
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getGroupItemsHt(id);
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-group-items.create')
  @Post()
  create(
    @Req() req: SecurityAuthenticatedRequest,
    @Body() body: CreateGroup_ht_itemsDto,
  ) {
    return this.service.createGroupItemsHt(
      body,
      getSecurityAuditActorUserId(req) ?? undefined,
    );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-group-items.update')
  @Patch(':id')
  update(
    @Req() req: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateGroup_ht_itemsDto,
  ) {
    return this.service.updateGroupItemsHt(
      id,
      body,
      getSecurityAuditActorUserId(req) ?? undefined,
    );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('worksheet-group-items.delete')
  @Delete(':id')
  remove(
    @Req() req: SecurityAuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteGroupItems(
      id,
      getSecurityAuditActorUserId(req) ?? undefined,
    );
  }
}
