import { Module } from '@nestjs/common';
import { SampletypeController } from './sampletype.controller';
import { SampleTypeService } from './sampletype.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SampleType } from './sampletype.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([SampleType]),
      UsersModule
    ],
    controllers: [SampletypeController],
    providers: [SampleTypeService]
  })
  export class SampleTypeModule {}
