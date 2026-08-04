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
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('invoice')
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  @Post()
  createInvoice(@Body() newInvoice: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(newInvoice);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() invoice: UpdateInvoiceDto,
  ) {
    return this.invoiceService.updateInvoice(id, invoice);
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.getInvoice(id);
  }

  @UseGuards(JwtUserGuard)
  @Get('/no/:no_invoice')
  getInvoiceNo(@Param('no_invoice', ParseIntPipe) no_invoice: number) {
    return this.invoiceService.getInvoiceNo(no_invoice);
  }

  @UseGuards(JwtUserGuard)
  @Post('/numbers')
  getInvoiceByNumber(@Body() body: { number: number[] }) {
    return this.invoiceService.getInvoiceByNumber(body.number);
  }

  @UseGuards(JwtUserGuard)
  @Post('/creditnote')
  getNCByNumber(@Body() body: { number: number[] }) {
    return this.invoiceService.getNCByNumber(body.number);
  }

  @UseGuards(JwtUserGuard)
  @Post('/date')
  getInvoicesDate(@Body() body: { date: Date }) {
    return this.invoiceService.getInvoicesDate(body.date);
  }
}
