import { Module } from '@nestjs/common';
import { Customer_accounts_receivableController } from './customer_accounts_receivable.controller';
import { CustomerAccountsReceivableService } from './customer_accounts_receivable.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customeraccountsreceivable } from './customer_accounts_receivable.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customeraccountsreceivable]),
    UsersModule,
  ],
  controllers: [Customer_accounts_receivableController],
  providers: [CustomerAccountsReceivableService],
})
export class CustomerAccountsReceivableModule {}
