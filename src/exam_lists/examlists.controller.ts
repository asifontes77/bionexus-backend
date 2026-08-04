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
import { ExamListsService } from './examlists.service';
import { CreateExam_listDto } from './dto/create-exam_lists.dto';
import { UpdateExam_listDto } from './dto/update-exam_lists.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('examlists')
export class ExamListsController {
  constructor(private examListsService: ExamListsService) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getExamList(@Param('id', ParseIntPipe) id: number) {
    return this.examListsService.getExamList(id);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getExamLists() {
    return this.examListsService.getExamLists();
  }

  @UseGuards(JwtUserGuard)
  @Get('/group/:id')
  getExamByGroup(@Param('id', ParseIntPipe) id: number) {
    return this.examListsService.getExamByGroup(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/search-description/:description')
  getExamListByDescription(@Param('description') description: string) {
    return this.examListsService.getExamListByDescription(description);
  }

  @UseGuards(JwtUserGuard)
  @Get('/grouplist/:id')
  getExamByGroupAnulled(@Param('id', ParseIntPipe) id: number) {
    return this.examListsService.getExamByGroupAnulled(id);
  }

  @Post()
  createExamList(@Body() newExam: CreateExam_listDto) {
    return this.examListsService.createExamList(newExam);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateExamList(
    @Param('id', ParseIntPipe) id: number,
    @Body() exam: UpdateExam_listDto,
  ) {
    return this.examListsService.updateExamList(id, exam);
  }
}
