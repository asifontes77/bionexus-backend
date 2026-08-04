import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypePayment } from './typepayment.entity';
import { Repository } from 'typeorm';
import { CreateTypepaymantDto } from './dto/create-typepayment.dto';
import { UpdateTypepaymantDto } from './dto/update-typepayment.dto';

@Injectable()
export class TypePaymentService {
  constructor(
    @InjectRepository(TypePayment)
    private typePaymentRepository: Repository<TypePayment>,
  ) {}

  async createTypepayment(typepayment: CreateTypepaymantDto): Promise<any> {
    return this.typePaymentRepository.save(typepayment);
  }

  async getTypepayments() {
    return this.typePaymentRepository.find();
  }

  async getTypepayment(id: number) {
    const typePaymentFound = this.typePaymentRepository.findOne({
      where: {
        id,
      },
    });
    if (!typePaymentFound) {
      return new HttpException(
        'forma de pago no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return typePaymentFound;
  }

  async updateTypepayment(id: number, typePayment: UpdateTypepaymantDto) {
    const typepaymentFound = await this.typePaymentRepository.findOne({
      where: {
        id,
      },
    });
    if (!typepaymentFound) {
      return new HttpException('No encontrado', HttpStatus.NOT_FOUND);
    }
    const updatetypepayment = Object.assign(typepaymentFound, typePayment);
    return this.typePaymentRepository.save(updatetypepayment);
  }
}
