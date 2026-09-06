import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Examlists } from '../exam_lists/examlists.entity';
import { special_test_items } from '../special_test_items/special_test_items.entity';
import { special_test_lab } from './special_test_lab.entity';
import { SpecialtestlabController } from './special_test_lab.controller';
import { SpecialTestLabService } from './special_test_lab.service';

@Module({
  imports: [TypeOrmModule.forFeature([special_test_lab, special_test_items, Examlists]), AuthorizationModule, SecurityAuditModule],
  controllers: [SpecialtestlabController],
  providers: [SpecialTestLabService],
})
export class SpecialTestLabModule {}
