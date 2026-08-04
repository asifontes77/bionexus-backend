import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './patients.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../users/jwt.constants';
import { JwtStrategy } from '../users/jwt.strategy';
import { LaboratoryModule } from 'src/laboratory/laboratory.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '20h' },
    }),
    LaboratoryModule,
    ConfigModule.forRoot(),
  ],
  controllers: [PatientsController],
  providers: [PatientsService, JwtStrategy],
  exports: [PatientsService],
})
export class PatientsModule {}
