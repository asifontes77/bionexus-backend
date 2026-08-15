import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { typepaymentController } from './typepayment.controller';
import { TypePayment } from './typepayment.entity';
import { TypePaymentService } from './typepayment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TypePayment]),
    UsersModule,
    AuthorizationModule,
    SecurityAuditModule,
  ],
  controllers: [typepaymentController],
  providers: [TypePaymentService],
})
export class TypePaymentModule {}
