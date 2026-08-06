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
import { ExamsService } from './exams.service';
import { UpdateExamsDto } from './dto/update-exams.dto';
import { CreateExamsDto } from './dto/create-exams.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('exams')
export class ExamsController {
  constructor(private examService: ExamsService) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getExam(@Param('id', ParseIntPipe) id: number) {
    return this.examService.getExam(id);
  }

  @Post()
  createExam(@Body() newExam: CreateExamsDto) {
    return this.examService.createExam(newExam);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateExam(
    @Param('id', ParseIntPipe) id: number,
    @Body() exam: UpdateExamsDto,
  ) {
    return this.examService.updateExam(id, exam);
  }

  @UseGuards(JwtUserGuard)
  @Post('/client')
  getPatientsWithClient(@Body() body: { clientIds: number[] }) {
    return this.examService.getPatientsWithClient(body.clientIds);
  }

  @UseGuards(JwtUserGuard)
  @Post('/groupHtItems')
  getTotalExamWithGroup(
    @Body() body: { examIds: number[]; firstDate: Date; lastDate: Date },
  ) {
    return this.examService.getTotalExamWithGroup(
      body.examIds,
      body.firstDate,
      body.lastDate,
    );
  }

  @UseGuards(JwtUserGuard)
  @Post('/clienttax')
  getPatientsWithClientTax(@Body() body: { clientIds: number[]; tax: number }) {
    return this.examService.getPatientsWithClientTax(body.clientIds, body.tax);
  }
}
