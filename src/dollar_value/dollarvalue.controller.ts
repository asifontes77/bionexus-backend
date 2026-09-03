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
import { UpdateDollarvalueDto } from './dto/update-dollarvalue.dto';
import { CreateDollarvalueDto } from './dto/create-dollarvalue.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { DollarvalueService } from './dollarvalue.service';

@Controller('dollarvalue')
export class DollarvalueController {
  constructor(private dollarvalueService: DollarvalueService) {}

  @UseGuards(JwtUserGuard)
  @Get('/get/')
  async getDollarvalue() {
    const rowTmp = await this.dollarvalueService.getDollarvalue();
    const row = structuredClone(rowTmp)[0];
    return row;
  }

  @Post()
  createDollarvalue(@Body() newDollarvalue: CreateDollarvalueDto) {
    return this.dollarvalueService.createDollarvalue(newDollarvalue);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateDollarvalue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dollarvalue: UpdateDollarvalueDto,
  ) {
    return this.dollarvalueService.updateDollarvalue(id, dollarvalue);
  }
}
