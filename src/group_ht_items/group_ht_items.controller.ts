import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../authorization/guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { CreateGroup_ht_itemsDto } from './dto/create-group_ht_items.dto';
import { UpdateGroup_ht_itemsDto } from './dto/update-group_ht_items.dto';
import { GroupHtItemsService } from './group_h_itemst.service';

@Controller('groupHtItems')
@UseGuards(JwtUserGuard, PermissionGuard)
export class GroupHtItemsController {
  constructor(private readonly service: GroupHtItemsService) {}

  @RequirePermissions('worksheet-groups.read')
  @Get(':id')
  getGroupItemsHt(@Param('id', ParseIntPipe) id: number) { return this.service.getGroupItemsHt(id); }

  @RequirePermissions('worksheet-groups.update')
  @Post()
  createGroupItemsHt(@Body() body: CreateGroup_ht_itemsDto) { return this.service.createGroupItemsHt(body); }

  @RequirePermissions('worksheet-groups.update')
  @Patch(':id')
  updateGroupItemsHt(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateGroup_ht_itemsDto) { return this.service.updateGroupItemsHt(id, body); }

  @RequirePermissions('worksheet-groups.update')
  @Delete(':id')
  deleteGroupItems(@Param('id', ParseIntPipe) id: number) { return this.service.deleteGroupItems(id); }
}
