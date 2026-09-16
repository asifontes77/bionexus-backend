import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { UsersModule } from '../users/users.module';
import { AntibioticController } from './antibiotic.controller';
import { Antibiotic } from './antibiotic.entity';
import { AntibioticService } from './antibiotic.service';

@Module({ imports: [TypeOrmModule.forFeature([Antibiotic]), UsersModule, AuthorizationModule, SecurityAuditModule], controllers: [AntibioticController], providers: [AntibioticService] })
export class AntibioticModule {}
