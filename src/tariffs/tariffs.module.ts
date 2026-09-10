import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Examlists } from '../exam_lists/examlists.entity';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { ExamTariffPricesController } from './exam-tariff-prices.controller';
import { ExamTariffPricesService } from './exam-tariff-prices.service';
import { Tariff } from './tariff.entity';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tariff, ExamTariffPrice, Examlists]),
    AuthorizationModule,
    SecurityAuditModule,
  ],
  controllers: [TariffsController, ExamTariffPricesController],
  providers: [TariffsService, ExamTariffPricesService],
  exports: [TariffsService, ExamTariffPricesService],
})
export class TariffsModule {}
