import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tax } from './tax.entity';
import { SecurityAuditModule } from '../audit/security-audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tax]),
    UsersModule,
    AuthorizationModule,
    SecurityAuditModule,
  ],
  controllers: [TaxController],
  providers: [TaxService],
})
export class TaxModule {}
