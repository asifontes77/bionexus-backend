import { Module } from '@nestjs/common';
import { Cash_registerController } from './cash_register.controller';
import { Cash_registerService } from './cash_register.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { cash_register } from './cash_register.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([cash_register]),
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h' },
    }),
  ],
  controllers: [Cash_registerController],
  providers: [Cash_registerService, JwtStrategy],
})
export class Cash_registerModule {}
