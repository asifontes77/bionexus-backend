import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoiceitems } from './invoiceitems.entity';
import { Repository } from 'typeorm';
import { CreateInvoiceitemsDto } from './dto/create-invoiceitems.dto';
import { UpdateInvoiceitemsDto } from './dto/update-invoiceitems.dto';

@Injectable()
export class InvoiceitemsService {
  constructor(
    @InjectRepository(Invoiceitems)
    private invoiceitemsRepository: Repository<Invoiceitems>,
  ) {}

  async createInvoiceitems(invoiceitems: CreateInvoiceitemsDto): Promise<any> {
    return this.invoiceitemsRepository.save(invoiceitems);
  }

  async updateInvoiceitems(id: number, invoiceitems: UpdateInvoiceitemsDto) {
    const invoiceitemsFound = await this.invoiceitemsRepository.findOne({
      where: {
        id,
      },
    });
    if (!invoiceitemsFound) {
      return new HttpException('factura no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateInvoice = Object.assign(invoiceitemsFound, invoiceitems);
    return this.invoiceitemsRepository.save(updateInvoice);
  }
}
