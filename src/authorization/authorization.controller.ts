import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AuthorizationAdministrationService } from './authorization-administration.service';
import { CreateSecurityRoleDto } from './dto/create-security-role.dto';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { JwtUserGuard } from '../users/jwt-user.guard';

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
  async getCurrentContext(
    @Req() request: AuthenticatedRequest,
  ) {
    const userId = request.user?.userId;

    if (
      !Number.isInteger(userId) ||
      userId === undefined ||
      userId <= 0
    ) {
      throw new ForbiddenException(
        'AUTHORIZATION_CONTEXT_UNAVAILABLE',
      );
    }

    const context =
      await this.authorizationService.resolveContext(userId);

    if (!context) {
      throw new ForbiddenException(
        'AUTHORIZATION_CONTEXT_UNAVAILABLE',
      );
    }

    return context;
  }
  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.roles.read')
  @Get('roles')
  async getRoles() {
    return this.administrationService.getRoles();
  }

  @UseGuards(JwtUserGuard, PermissionGuard)
  @RequirePermissions('security.roles.create')
  @Post('roles')
  async createRole(
    @Body() body: CreateSecurityRoleDto,
  ) {
    return this.administrationService.createRole(body);
  }
}
