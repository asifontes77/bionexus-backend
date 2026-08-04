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
import { TypePaymentService } from './typepayment.service';
import { CreateTypepaymantDto } from './dto/create-typepayment.dto';
import { UpdateTypepaymantDto } from './dto/update-typepayment.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('Typepayment')
export class typepaymentController {
  constructor(private typepaymentService: TypePaymentService) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getTypepayment(@Param('id', ParseIntPipe) id: number) {
    return this.typepaymentService.getTypepayment(id);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getTypepayments() {
    return this.typepaymentService.getTypepayments();
  }

  @Post()
  createTypepayment(@Body() newTypepayment: CreateTypepaymantDto) {
    return this.typepaymentService.createTypepayment(newTypepayment);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateTypepayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() sampletype: UpdateTypepaymantDto,
  ) {
    return this.typepaymentService.updateTypepayment(id, sampletype);
  }
}
