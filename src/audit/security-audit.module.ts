import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityAuditLog } from './security-audit-log.entity';
import { SecurityAuditService } from './security-audit.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SecurityAuditLog])],
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
