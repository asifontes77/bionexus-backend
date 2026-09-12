import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { Bank } from './bank.entity';
import { Currency } from './currency.entity';
import { PaymentMethodCurrency } from './payment-method-currency.entity';
import { PaymentMethodField } from './payment-method-field.entity';
import { typepaymentController } from './typepayment.controller';
import { TypePayment } from './typepayment.entity';
import { TypePaymentService } from './typepayment.service';

@Module({
  imports: [TypeOrmModule.forFeature([TypePayment, Currency, Bank, PaymentMethodCurrency, PaymentMethodField]), UsersModule, AuthorizationModule, SecurityAuditModule],
  controllers: [typepaymentController],
  providers: [TypePaymentService],
  exports: [TypePaymentService, TypeOrmModule],
})
export class TypePaymentModule {}
