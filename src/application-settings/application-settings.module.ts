import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Currency } from '../type_payment/currency.entity';
import { ApplicationSettingsController } from './application-settings.controller';
import { ApplicationSettings } from './application-settings.entity';
import { ApplicationSettingsGateway } from './application-settings.gateway';
import { ApplicationSettingsService } from './application-settings.service';
import { FinancialPrimaryCurrencyGuardService } from './financial-primary-currency-guard.service';

@Module({
  imports: [AuthorizationModule, SecurityAuditModule, TypeOrmModule.forFeature([ApplicationSettings, Currency])],
  controllers: [ApplicationSettingsController],
  providers: [ApplicationSettingsService, ApplicationSettingsGateway, FinancialPrimaryCurrencyGuardService],
})
export class ApplicationSettingsModule {}
