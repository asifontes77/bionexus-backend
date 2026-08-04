import { Module } from '@nestjs/common';
import { AntibioticController } from './antibiotic.controller';
import { AntibioticService } from './antibiotic.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Antibiotic } from './antibiotic.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Antibiotic]), 
      UsersModule,
      JwtModule.register({
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '20h'},
      })
    ],
    controllers: [AntibioticController],
    providers: [AntibioticService, JwtStrategy]
  })
  export class AntibioticModule {}