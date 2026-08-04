import { Module } from '@nestjs/common';
import { ParasiticformsController } from './parasiticforms.controller';
import { ParasiticformsService } from './parasiticforms.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parasiticforms } from './parasiticforms.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Parasiticforms]), 
      UsersModule,
      JwtModule.register({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '20h'},
      })
    ],
    controllers: [ParasiticformsController],
    providers: [ParasiticformsService, JwtStrategy]
  })
  export class ParasiticformsModule {}