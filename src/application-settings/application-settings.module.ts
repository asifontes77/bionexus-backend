import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Laboratory } from '../laboratory/laboratory.entity';
import { ApplicationSettingsController } from './application-settings.controller';
import { ApplicationSettingsService } from './application-settings.service';
@Module({ imports: [AuthorizationModule, SecurityAuditModule, TypeOrmModule.forFeature([Laboratory])], controllers: [ApplicationSettingsController], providers: [ApplicationSettingsService] })
export class ApplicationSettingsModule {}