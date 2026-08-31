import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './patients.entity';
import { LaboratoryModule } from 'src/laboratory/laboratory.module';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Patient]), LaboratoryModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
