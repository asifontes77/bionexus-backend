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
import { Invoiceitems } from './invoiceitems.entity';
import { InvoiceitemsService } from './invoiceitems.service';
import { CreateInvoiceitemsDto } from './dto/create-invoiceitems.dto';
import { UpdateInvoiceitemsDto } from './dto/update-invoiceitems.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('invoiceitems')
export class InvoiceitemsController {
  constructor(private invoiceitemsService: InvoiceitemsService) {}

  @Post()
  createInvoiceitems(@Body() newInvoiceitems: CreateInvoiceitemsDto) {
    return this.invoiceitemsService.createInvoiceitems(newInvoiceitems);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateInvoiceitems(
    @Param('id', ParseIntPipe) id: number,
    @Body() invoiceitems: UpdateInvoiceitemsDto,
  ) {
    return this.invoiceitemsService.updateInvoiceitems(id, invoiceitems);
  }
}
