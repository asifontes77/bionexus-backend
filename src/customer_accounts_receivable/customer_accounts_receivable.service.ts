import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customeraccountsreceivable } from './customer_accounts_receivable.entity';
import { Repository } from 'typeorm';
import { CreateCustomerAccountsReceivableDto } from './dto/create-customer_accounts_receivable.dto';
import { UpdateCustomerAccountsReceivableDto } from './dto/update-customer_accounts_receivable.dto';

@Injectable()
export class CustomerAccountsReceivableService {
  constructor(
    @InjectRepository(Customeraccountsreceivable)
    private customer_accounts_receivableRepository: Repository<Customeraccountsreceivable>,
  ) {}

  async getAccountsReceivable(id: number) {
    const accountsReceivable =
      this.customer_accounts_receivableRepository.findOne({
        where: {
          id,
        },
      });
    if (!accountsReceivable) {
      return new HttpException(
        'cuenta por cobrar no encontradas',
        HttpStatus.NOT_FOUND,
      );
    }
    return accountsReceivable;
  }

  async getAccountsReceivableWithClient(id: number) {
    const accountsReceivableFound =
      this.customer_accounts_receivableRepository.find({
        where: {
          client_id: id,
        },
      });
    if (!accountsReceivableFound) {
      return new HttpException(
        'cuenta por cobrar no encontradas',
        HttpStatus.NOT_FOUND,
      );
    }
    return accountsReceivableFound;
  }

  async getAccountsReceivableWithClientDate(id: number, fecha: Date) {
    return this.customer_accounts_receivableRepository
      .createQueryBuilder('Customeraccountsreceivable')
      .where('client_id = :id', { id: id })
      .andWhere('DATE(fecha) = DATE(:fecha)', { fecha: fecha })
      .orderBy('id', 'DESC')
      .getMany();
  }

  async getAccountsReceivableWithClientBetweenDate(
    clientId: number,
    firstDate: Date,
    lastDate: Date,
  ) {
    return this.customer_accounts_receivableRepository
      .createQueryBuilder('Customeraccountsreceivable')
      .where('client_id = :clientId', { clientId: clientId })
      .andWhere('DATE(createdAt) BETWEEN :firstDate AND :lastDate', {
        firstDate,
        lastDate,
      })
      .orderBy('id', 'DESC')
      .getMany();
  }

  async createAccountsReceivable(
    accountsReceivable: CreateCustomerAccountsReceivableDto,
  ) {
    const newAccountsReceivable =
      this.customer_accounts_receivableRepository.create(accountsReceivable);
    return this.customer_accounts_receivableRepository.save(
      newAccountsReceivable,
    );
  }

  async updateAccountsReceivable(
    id: number,
    accountsReceivable: UpdateCustomerAccountsReceivableDto,
  ) {
    const accountsReceivableFound =
      await this.customer_accounts_receivableRepository.findOne({
        where: {
          id,
        },
      });
    if (!accountsReceivableFound) {
      return new HttpException(
        'cuenta por cobrar no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateAccountsReceivable = Object.assign(
      accountsReceivableFound,
      accountsReceivable,
    );
    return this.customer_accounts_receivableRepository.save(
      updateAccountsReceivable,
    );
  }
}
