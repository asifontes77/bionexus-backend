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
import { SampleTypeService } from './sampletype.service';
import { CreateSampletypeDto } from './dto/create-sampletype.dto';
import { UpdateSampletypeDto } from './dto/update-sampletype.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('Sampletype')
export class SampletypeController {
  constructor(private sampletypeService: SampleTypeService) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getSampletype(@Param('id', ParseIntPipe) id: number) {
    return this.sampletypeService.getSampletype(id);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getSampletypes() {
    return this.sampletypeService.getSampletypes();
  }

  @Post()
  createSampletype(@Body() newSampletype: CreateSampletypeDto) {
    return this.sampletypeService.createSampletype(newSampletype);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateExamList(
    @Param('id', ParseIntPipe) id: number,
    @Body() sampletype: UpdateSampletypeDto,
  ) {
    return this.sampletypeService.updateSampletype(id, sampletype);
  }
}
