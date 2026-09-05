import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Examlists } from '../exam_lists/examlists.entity';
import { special_test_lab } from '../special_test_lab/special_test_lab.entity';
import { special_test_items } from './special_test_items.entity';
import { SpecialtestItemsController } from './special_test_items.controller';
import { SpecialTestItemsService } from './special_test_items.service';

@Module({
  imports: [TypeOrmModule.forFeature([special_test_items, special_test_lab, Examlists]), AuthorizationModule, SecurityAuditModule],
  controllers: [SpecialtestItemsController],
  providers: [SpecialTestItemsService],
})
export class SpecialTestItemsModule {}
