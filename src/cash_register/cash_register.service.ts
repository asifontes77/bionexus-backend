import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { cash_register } from './cash_register.entity';
import { Repository } from 'typeorm';
import { CreateCash_registerDto } from './dto/create-cash_register.dto';
import { UpdateCash_registerDto } from './dto/update-cash_register.dto';

Injectable();
export class Cash_registerService {
  constructor(
    @InjectRepository(cash_register)
    private cash_registerRepository: Repository<cash_register>,
  ) {}

  async getCash_registerLists() {
    return this.cash_registerRepository.find();
  }

  async getCash_register(id: number) {
    const cash_registerFound = this.cash_registerRepository.find({
      where: {
        id,
      },
    });
    if (!cash_registerFound) {
      return new HttpException(
        'movimiento de caja no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return cash_registerFound;
  }

  async createCash_register(
    cash_register: CreateCash_registerDto,
  ): Promise<any> {
    return this.cash_registerRepository.save(cash_register);
  }

  async updateCash_register(id: number, newCash: UpdateCash_registerDto) {
    const cashFound = await this.cash_registerRepository.findOne({
      where: {
        id,
      },
    });
    if (!cashFound) {
      return new HttpException(
        'movimiento de caja no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateCash = Object.assign(cashFound, newCash);
    return this.cash_registerRepository.save(updateCash);
  }

  async getCash_registerDateResult(admission: Date, idUser: number) {
    return this.cash_registerRepository
      .createQueryBuilder('cash_register')
      .where('admission_date = :admission', { admission })
      .andWhere('cash_register.user_id = :idUser', { idUser })
      .getMany();
  }
}
