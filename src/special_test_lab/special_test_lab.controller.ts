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
import { SpecialTestLabService } from './special_test_lab.service';
import { JwtUserGuard } from 'src/users/jwt-user.guard';
import { CreateSpecialTestLabDto } from './dto/create-special_test_lab.dto';
import { UpdateSpecialTestLabDto } from './dto/update-special_test_lab.dto';

@Controller('specialtestlab')
export class SpecialtestlabController {
  constructor(private specialtestlabService: SpecialTestLabService) {}

  @Post()
  createSpecialTestLab(@Body() newLaboratory: CreateSpecialTestLabDto) {
    return this.specialtestlabService.createSpecialTestLab(newLaboratory);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getSpecialTestLabList() {
    return this.specialtestlabService.getSpecialTestLabList();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getSpecialTestLab(@Param('id', ParseIntPipe) id: number) {
    return this.specialtestlabService.getSpecialTestLab(id);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateSpecialTestLab(
    @Param('id', ParseIntPipe) id: number,
    @Body() laboratory: UpdateSpecialTestLabDto,
  ) {
    return this.specialtestlabService.updateSpecialTestLab(id, laboratory);
  }
}
