import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { CreateSecurityRoleDto } from './dto/create-security-role.dto';
import { ReplaceUserPermissionOverridesDto } from './dto/replace-user-permission-overrides.dto';
import { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { UpdateSecurityRoleDto } from './dto/update-security-role.dto';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';
import {
  getSecurityAuditActorUserId,
  SecurityAuthenticatedRequest,
} from '../audit/security-audit-context';

interface AuthenticatedRequest {
  user?: {
    userId?: number;
    username?: string;
  };
}

@Controller('authorization')
export class AuthorizationController {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly administrationService: AuthorizationAdministrationService,
  ) {}

  @UseGuards(JwtUserGuard)
  @Get('me')
  async getCurrentContext(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.userId;

    if (!Number.isInteger(userId) || userId === undefined || userId <= 0) {
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    }

    const context = await this.authorizationService.resolveContext(userId);

    if (!context) {
      throw new ForbiddenException('AUTHORIZATION_CONTEXT_UNAVAILABLE');
    }

    return context;
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.assign-permissions')
  @Put('users/:id/permission-overrides')
  async replaceUserPermissionOverrides(
    @Param('id', ParseIntPipe) userId: number,
    @Body() body: ReplaceUserPermissionOverridesDto,
    @Req() request?: SecurityAuthenticatedRequest,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return actorUserId === null
      ? this.administrationService.replaceUserPermissionOverrides(
          userId,
          body,
        )
      : this.administrationService.replaceUserPermissionOverrides(
          userId,
          body,
          actorUserId,
        );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.assign-roles')
  @Put('users/:id/roles')
  async replaceUserRoles(
    @Param('id', ParseIntPipe) userId: number,
    @Body() body: ReplaceUserRolesDto,
    @Req() request?: SecurityAuthenticatedRequest,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return actorUserId === null
      ? this.administrationService.replaceUserRoles(userId, body)
      : this.administrationService.replaceUserRoles(
          userId,
          body,
          actorUserId,
        );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.read')
  @Get('users')
  async getUsersAdministration() {
    return this.administrationService.getUsersAdministration();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.users.read')
  @Get('users/:id')
  async getUserAuthorization(@Param('id', ParseIntPipe) userId: number) {
    return this.administrationService.getUserAuthorization(userId);
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.permissions.read')
  @Get('permissions')
  async getPermissions() {
    return this.administrationService.getPermissions();
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.roles.read')
  @Get('roles')
  async getRoles() {
    return this.administrationService.getRoles();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.roles.read', 'security.permissions.read')
  @Get('roles/:id/permissions')
  async getRolePermissions(@Param('id', ParseIntPipe) roleId: number) {
    return this.administrationService.getRolePermissions(roleId);
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.roles.assign-permissions')
  @Put('roles/:id/permissions')
  async replaceRolePermissions(
    @Param('id', ParseIntPipe) roleId: number,
    @Body() body: ReplaceRolePermissionsDto,
    @Req() request?: SecurityAuthenticatedRequest,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return actorUserId === null
      ? this.administrationService.replaceRolePermissions(roleId, body)
      : this.administrationService.replaceRolePermissions(
          roleId,
          body,
          actorUserId,
        );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.roles.update')
  @Patch('roles/:id')
  async updateRole(
    @Param('id', ParseIntPipe) roleId: number,
    @Body() body: UpdateSecurityRoleDto,
    @Req() request?: SecurityAuthenticatedRequest,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return actorUserId === null
      ? this.administrationService.updateRole(roleId, body)
      : this.administrationService.updateRole(
          roleId,
          body,
          actorUserId,
        );
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.roles.create')
  @Post('roles')
  async createRole(
    @Body() body: CreateSecurityRoleDto,
    @Req() request?: SecurityAuthenticatedRequest,
  ) {
    const actorUserId = getSecurityAuditActorUserId(request);
    return actorUserId === null
      ? this.administrationService.createRole(body)
      : this.administrationService.createRole(body, actorUserId);
  }
}
