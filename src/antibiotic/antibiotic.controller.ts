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
import { AntibioticService } from './antibiotic.service';
import { CreateAntibioticDto } from './dto/create-antibiotic.dto';
import { UpdateAntibioticDto } from './dto/update-antibiotic.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('antibiotic')
export class AntibioticController {
  constructor(private antibioticService: AntibioticService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  getAntibioticLists() {
    return this.antibioticService.getAntibioticLists();
  }

  @UseGuards(JwtUserGuard)
  @Get('/order')
  getAntibioticListsOrder() {
    return this.antibioticService.getAntibioticListsOrder();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getAntibiotic(@Param('id', ParseIntPipe) id: number) {
    return this.antibioticService.getAntibiotic(id);
  }

  @Post()
  createAntibiotic(@Body() newAntibiotic: CreateAntibioticDto) {
    return this.antibioticService.createAntibiotic(newAntibiotic);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateAntibiotic(
    @Param('id', ParseIntPipe) id: number,
    @Body() antibiotic: UpdateAntibioticDto,
  ) {
    return this.antibioticService.updateAntibiotic(id, antibiotic);
  }
}
