import { Module } from '@nestjs/common';
import { Cash_registerController } from './cash_register.controller';
import { Cash_registerService } from './cash_register.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { cash_register } from './cash_register.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([cash_register]), UsersModule],
  controllers: [Cash_registerController],
  providers: [Cash_registerService],
})
export class Cash_registerModule {}
