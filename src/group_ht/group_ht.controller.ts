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
import { GroupHtService } from './group_ht.service';
import { CreateGroup_htDto } from './dto/create-group_ht.dto';
import { UpdateGroup_htDto } from './dto/update-group_ht.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('groupHt')
export class GroupHtController {
  constructor(private group_htService: GroupHtService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  getGroupHtList() {
    return this.group_htService.getGroupHtList();
  }

  @UseGuards(JwtUserGuard)
  @Get('/list')
  getGroupHtListActive() {
    return this.group_htService.getGroupHtListActive();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getGroupHt(@Param('id', ParseIntPipe) id: number) {
    return this.group_htService.getGroupHt(id);
  }
  @UseGuards(JwtUserGuard)
  @Get('/count/:description')
  countWithLike(@Param('description') description: string) {
    return this.group_htService.countWithLike(description);
  }

  @Post()
  createGroupHt(@Body() newGroupHt: CreateGroup_htDto) {
    return this.group_htService.createGroupHt(newGroupHt);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateGroupHt(
    @Param('id', ParseIntPipe) id: number,
    @Body() groupHt: UpdateGroup_htDto,
  ) {
    return this.group_htService.updateGroupHt(id, groupHt);
  }

  @Delete(':id')
  deleteGroupHt(@Param('id', ParseIntPipe) id: number) {
    return this.group_htService.deleteGroupHt(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/group/:id')
  getExamgroupsListGroup() {
    return this.group_htService.getGroupList();
  }
}
