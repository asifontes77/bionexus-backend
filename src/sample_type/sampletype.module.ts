import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
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
    SecurityAuditModule,
  ],
  controllers: [SampletypeController],
  providers: [SampleTypeService],
})
export class SampleTypeModule {}
