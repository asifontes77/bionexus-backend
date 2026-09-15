import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Client } from '../client/client.entity';
import { Currency } from '../type_payment/currency.entity';
import { Examlists } from '../exam_lists/examlists.entity';
import { AdmissionTariffResolverController } from './admission-tariff-resolver.controller';
import { AdmissionTariffResolverService } from './admission-tariff-resolver.service';
import { ExamTariffPrice } from './exam-tariff-price.entity';
import { ExamTariffPricesController } from './exam-tariff-prices.controller';
import { ExamTariffPricesService } from './exam-tariff-prices.service';
import { Tariff } from './tariff.entity';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tariff, ExamTariffPrice, Examlists, Client, Currency]),
    AuthorizationModule,
    SecurityAuditModule,
  ],
  controllers: [TariffsController, ExamTariffPricesController, AdmissionTariffResolverController],
  providers: [TariffsService, ExamTariffPricesService, AdmissionTariffResolverService],
  exports: [TariffsService, ExamTariffPricesService, AdmissionTariffResolverService],
})
export class TariffsModule {}
