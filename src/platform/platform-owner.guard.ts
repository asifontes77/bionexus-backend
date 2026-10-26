import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
@Injectable()
export class PlatformOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { identityType?: string } }>();
    if (request.user?.identityType !== 'platform-owner') throw new ForbiddenException('PLATFORM_OWNER_REQUIRED');
    return true;
  }
}
