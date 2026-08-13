import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { LaboratoryModule } from 'src/laboratory/laboratory.module';
import { LicenseModule } from 'src/license/license.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SecurityAuditModule } from '../audit/security-audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    LaboratoryModule,
    LicenseModule,
    AuthorizationModule,
    SecurityAuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
