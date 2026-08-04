import { Module } from '@nestjs/common';
import { AntibioticController } from './antibiotic.controller';
import { AntibioticService } from './antibiotic.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Antibiotic } from './antibiotic.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Antibiotic]), 
      UsersModule
    ],
    controllers: [AntibioticController],
    providers: [AntibioticService]
  })
  export class AntibioticModule {}
