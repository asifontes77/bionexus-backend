import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ApplicationSettingsController } from './application-settings.controller';
import { ApplicationSettings } from './application-settings.entity';
import { ApplicationSettingsGateway } from './application-settings.gateway';
import { ApplicationSettingsService } from './application-settings.service';

@Module({
  imports: [AuthorizationModule, SecurityAuditModule, TypeOrmModule.forFeature([ApplicationSettings])],
  controllers: [ApplicationSettingsController],
  providers: [ApplicationSettingsService, ApplicationSettingsGateway],
})
export class ApplicationSettingsModule {}
