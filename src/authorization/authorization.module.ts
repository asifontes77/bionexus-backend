import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { AuthorizationController } from './authorization.controller';
import { AuthorizationService } from './authorization.service';
import { AuthorizationEventsGateway } from './authorization-events.gateway';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRolePermission } from './entities/security-role-permission.entity';
import { SecurityRole } from './entities/security-role.entity';
import { SecurityUserPermissionOverride } from './entities/security-user-permission-override.entity';
import { SecurityUserRole } from './entities/security-user-role.entity';
import { PermissionGuard } from './guards/permission.guard';
import { SecurityAuditModule } from '../audit/security-audit.module';

@Module({
  imports: [
    SecurityAuditModule,
    TypeOrmModule.forFeature([
      User,
      SecurityRole,
      SecurityPermission,
      SecurityRolePermission,
      SecurityUserRole,
      SecurityUserPermissionOverride,
    ]),
  ],
  controllers: [AuthorizationController],
  providers: [
    AuthorizationService,
    AuthorizationAdministrationService,
    AuthorizationEventsGateway,
    PermissionGuard,
  ],
  exports: [
    AuthorizationService,
    PermissionGuard,
  ],
})
export class AuthorizationModule {}
