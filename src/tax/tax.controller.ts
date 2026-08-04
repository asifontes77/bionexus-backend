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
import { TaxService } from './tax.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('tax')
export class TaxController {
  constructor(private taxService: TaxService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  getTaxs() {
    return this.taxService.getTaxs();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getTax(@Param('id', ParseIntPipe) id: number) {
    return this.taxService.getTax(id);
  }

  @Post()
  createTax(@Body() newTax: CreateTaxDto) {
    return this.taxService.createTax(newTax);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateTax(@Param('id', ParseIntPipe) id: number, @Body() tax: UpdateTaxDto) {
    return this.taxService.updateTax(id, tax);
  }

  @UseGuards(JwtUserGuard)
  @Delete(':id')
  deleteTax(@Param('id', ParseIntPipe) id: number) {
    return this.taxService.deleteTax(id);
  }
}
