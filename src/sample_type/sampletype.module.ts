import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { SampletypeController } from './sampletype.controller';
import { SampleType } from './sampletype.entity';
import { SampleTypeService } from './sampletype.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([SampleType]),
    UsersModule,
    AuthorizationModule,
  ],
  controllers: [SampletypeController],
  providers: [SampleTypeService],
})
export class SampleTypeModule {}
