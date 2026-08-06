import { Module } from '@nestjs/common';
import { typepaymentController } from './typepayment.controller';
import { TypePaymentService } from './typepayment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypePayment } from './typepayment.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([TypePayment]), UsersModule],
  controllers: [typepaymentController],
  providers: [TypePaymentService],
})
export class TypePaymentModule {}
