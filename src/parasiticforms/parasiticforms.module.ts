import { Module } from '@nestjs/common';
import { ParasiticformsController } from './parasiticforms.controller';
import { ParasiticformsService } from './parasiticforms.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parasiticforms } from './parasiticforms.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([Parasiticforms]), 
      UsersModule
    ],
    controllers: [ParasiticformsController],
    providers: [ParasiticformsService]
  })
  export class ParasiticformsModule {}
