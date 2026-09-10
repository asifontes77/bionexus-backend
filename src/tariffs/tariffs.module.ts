import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { Tariff } from './tariff.entity';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tariff, ExamTariffPrice]),
    AuthorizationModule,
    SecurityAuditModule,
  ],
  controllers: [TariffsController],
  providers: [TariffsService],
  exports: [TariffsService],
})
export class TariffsModule {}
