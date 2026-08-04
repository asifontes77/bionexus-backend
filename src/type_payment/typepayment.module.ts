import { Module } from '@nestjs/common';
import { typepaymentController } from './typepayment.controller';
import { TypePaymentService } from './typepayment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypePayment } from './typepayment.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([TypePayment]),
      UsersModule,
      JwtModule.register({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '20h'},
      })
    ],
    controllers: [typepaymentController],
    providers: [TypePaymentService, JwtStrategy]
  })
  export class TypePaymentModule {}
