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
import { RoutinesService } from './routines.service';
import { CreateRoutinesDto } from './dto/create-routines.dto';
import { UpdateRoutinesDto } from './dto/update-routines.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('routines')
export class RoutinesController {
  constructor(private routineService: RoutinesService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  getRoutinesList() {
    return this.routineService.getRoutinesList();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getRoutines(@Param('id', ParseIntPipe) id: number) {
    return this.routineService.getRoutines(id);
  }

  @Post()
  createRoutines(@Body() newGroupHt: CreateRoutinesDto) {
    return this.routineService.createRoutines(newGroupHt);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateRoutines(
    @Param('id', ParseIntPipe) id: number,
    @Body() routine: UpdateRoutinesDto,
  ) {
    return this.routineService.updateRoutines(id, routine);
  }

  @UseGuards(JwtUserGuard)
  @Delete(':id')
  deleteGroupHt(@Param('id', ParseIntPipe) id: number) {
    return this.routineService.deleteRoutines(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/count/:description')
  countWithLike(@Param('description') description: string) {
    return this.routineService.countWithLike(description);
  }
}
