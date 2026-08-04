import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { Repository } from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
  ) {}

  async createInvoice(invoice: CreateInvoiceDto): Promise<any> {
    return this.invoiceRepository.save(invoice);
  }

  async updateInvoice(id: number, invoice: UpdateInvoiceDto) {
    const invoiceFound = await this.invoiceRepository.findOne({
      where: {
        id,
      },
    });
    if (!invoiceFound) {
      return new HttpException('factura no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateInvoice = Object.assign(invoiceFound, invoice);
    return this.invoiceRepository.save(updateInvoice);
  }

  async getInvoice(id: number) {
    const invoiceFound = this.invoiceRepository.findOne({
      where: {
        id,
      },
      relations: ['invoiceitems'],
    });
    if (!invoiceFound) {
      return new HttpException('factura no encontrado', HttpStatus.NOT_FOUND);
    }
    return invoiceFound;
  }

  async getInvoiceNo(no_invoice: number) {
    const invoiceFound = this.invoiceRepository.findOne({
      where: {
        no_invoice,
      },
      relations: ['invoiceitems'],
    });
    if (!invoiceFound) {
      return new HttpException('factura no encontrado', HttpStatus.NOT_FOUND);
    }
    return invoiceFound;
  }

  async getInvoiceByNumber(number: number[]) {
    const type = 'Factura';
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.invoiceitems', 'items')
      .where('no_invoice IN (:...number)', { number })
      .andWhere('document_type= :type', { type })
      .orderBy('invoice.id', 'ASC')
      .getMany();
  }

  async getNCByNumber(number: number[]) {
    const type = 'NC';
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.invoiceitems', 'items')
      .where('no_invoice IN (:...number)', { number })
      .andWhere('document_type= :type', { type })
      .orderBy('invoice.id', 'ASC')
      .getMany();
  }

  async getInvoicesDate(admission: Date) {
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.invoiceitems', 'items')
      .where('DATE(date)= :admission', { admission })
      .orderBy('invoice.id', 'ASC')
      .getMany();
  }
}
