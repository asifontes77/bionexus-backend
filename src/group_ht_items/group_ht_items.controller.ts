import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { GroupHtItemsService } from './group_h_itemst.service';
import { CreateGroup_ht_itemsDto } from './dto/create-group_ht_items.dto';
import { UpdateGroup_ht_itemsDto } from './dto/update-group_ht_items.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('groupHtItems')
export class GroupHtItemsController {
  constructor(private groupHtService: GroupHtItemsService) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getGroupItemsHt(@Param('id', ParseIntPipe) id: number) {
    return this.groupHtService.getGroupItemsHt(id);
  }

  @Post()
  createGroupItemsHt(@Body() newGroupHt: CreateGroup_ht_itemsDto) {
    return this.groupHtService.createGroupItemsHt(newGroupHt);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateGroupItemsHt(
    @Param('id', ParseIntPipe) id: number,
    @Body() groupHt: UpdateGroup_ht_itemsDto,
  ) {
    return this.groupHtService.updateGroupItemsHt(id, groupHt);
  }

  @Delete(':id')
  deleteGroupItems(@Param('id', ParseIntPipe) id: number) {
    return this.groupHtService.deleteGroupItems(id);
  }
}
