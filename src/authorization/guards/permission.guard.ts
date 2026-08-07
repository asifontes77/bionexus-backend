import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

interface AuthenticatedRequest {
  user?: {
    userId?: number;
    username?: string;
  };
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        REQUIRED_PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      ) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;

    if (
      !Number.isInteger(userId) ||
      userId === undefined ||
      userId <= 0
    ) {
      return false;
    }

    return this.authorizationService.hasAllPermissions(
      userId,
      requiredPermissions,
    );
  }
}
