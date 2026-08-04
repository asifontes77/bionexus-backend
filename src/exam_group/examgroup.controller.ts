import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ExamGroupService } from './examgroup.service';
import { JwtUserGuard } from 'src/users/jwt-user.guard';
import { CreateExamgroupDto } from './dto/create-examgroup.dto';
import { UpdateExamgroupDto } from './dto/update-examgroup.dto';

@Controller('examgroup')
export class ExamGroupController {
  constructor(private examGroupService: ExamGroupService) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getExamgroup(@Param('id', ParseIntPipe) id: number) {
    return this.examGroupService.getExamgroup(id);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getExamgroups() {
    return this.examGroupService.getExamgroups();
  }

  @UseGuards(JwtUserGuard)
  @Get('/all/:id')
  getExamgroupstodos(@Param('id', ParseIntPipe) id: number) {
    return this.examGroupService.getExamgroupstodos(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/group/:id')
  getExamgroupsListGroup() {
    return this.examGroupService.getExamgroupsList();
  }

  @UseGuards(JwtUserGuard)
  @Get('/view/:id')
  getExamgroupsViewList() {
    return this.examGroupService.getExamgroupsViewList();
  }

  @Post()
  createExamgroup(@Body() newGroup: CreateExamgroupDto) {
    return this.examGroupService.createExamgroup(newGroup);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateExamgroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() examgroup: UpdateExamgroupDto,
  ) {
    return this.examGroupService.updateExamgroup(id, examgroup);
  }
}
