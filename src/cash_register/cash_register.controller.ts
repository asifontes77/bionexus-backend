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
import { Cash_registerService } from './cash_register.service';
import { UpdateCash_registerDto } from './dto/update-cash_register.dto';
import { CreateCash_registerDto } from './dto/create-cash_register.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('cash_register')
export class Cash_registerController {
  constructor(private cash_registerService: Cash_registerService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  getCash_registerLists() {
    return this.cash_registerService.getCash_registerLists();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getCash_register(@Param('id', ParseIntPipe) id: number) {
    return this.cash_registerService.getCash_register(id);
  }

  @Post()
  createCash_register(@Body() newCash: CreateCash_registerDto) {
    return this.cash_registerService.createCash_register(newCash);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateCash_register(
    @Param('id', ParseIntPipe) id: number,
    @Body() cash: UpdateCash_registerDto,
  ) {
    return this.cash_registerService.updateCash_register(id, cash);
  }

  @UseGuards(JwtUserGuard)
  @Post('/date')
  getCash_registerDateResult(@Body() body: { date: Date; idUser: number }) {
    return this.cash_registerService.getCash_registerDateResult(
      body.date,
      body.idUser,
    );
  }
}
