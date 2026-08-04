import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tax } from './tax.entity';
import { Repository } from 'typeorm';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxService {
  constructor(@InjectRepository(Tax) private taxRepository: Repository<Tax>) {}

  async getTaxs() {
    return this.taxRepository.find();
  }

  async createTax(tax: CreateTaxDto) {
    const newTax = this.taxRepository.create(tax);
    return this.taxRepository.save(newTax);
  }

  async getTax(id: number) {
    const taxFound = this.taxRepository.findOne({
      where: {
        id,
      },
    });
    if (!taxFound) {
      return new HttpException('Impuesto no encontrado', HttpStatus.NOT_FOUND);
    }
    return taxFound;
  }

  async deleteTax(id: number) {
    const routineFound = await this.taxRepository.findOne({
      where: {
        id,
      },
    });
    if (!routineFound) {
      return new HttpException('Impuesto no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.taxRepository.remove(routineFound);
    return true;
  }

  async updateTax(id: number, tazLists: UpdateTaxDto) {
    const taxFound = await this.taxRepository.findOne({
      where: {
        id,
      },
    });
    if (!taxFound) {
      return new HttpException('Impuesto no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateTax = Object.assign(taxFound, tazLists);
    return this.taxRepository.save(updateTax);
  }
}
