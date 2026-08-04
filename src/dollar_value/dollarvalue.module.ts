import { Module } from '@nestjs/common';
import { DollarvalueController } from './dollarvalue.controller';
import { DollarvalueService } from './dollarvalue.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dollarvalue } from './dollarvalue.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';

@Module({
    imports: [
        TypeOrmModule.forFeature([Dollarvalue]),
        JwtModule.register({
          secret: jwtConstants.secret,
          signOptions: { expiresIn: '20h'},
        })
      ],
      controllers: [DollarvalueController],
      providers: [DollarvalueService, JwtStrategy],
})
export class DollarvalueModule {}