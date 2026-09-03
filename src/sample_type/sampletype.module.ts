import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { SampletypeController } from './sampletype.controller';
import { SampleType } from './sampletype.entity';
import { SampleTypeService } from './sampletype.service';

@Module({
  imports: [
    AuthorizationModule,
    SecurityAuditModule,
    TypeOrmModule.forFeature([SampleType]),
  ],
  controllers: [SampletypeController],
  providers: [SampleTypeService],
})
export class SampleTypeModule {}
